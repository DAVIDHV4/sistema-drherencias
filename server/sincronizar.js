require('dotenv').config();
const pool = require('./db');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; 
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });
const FOLDER_BASE_ID = process.env.GOOGLE_FOLDER_BASE_ID;

async function getOrCreateFolder(folderName, parentId) {
    const res = await drive.files.list({ q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`, fields: 'files(id, name)' });
    if (res.data.files.length > 0) return res.data.files[0].id;
    const folder = await drive.files.create({ resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }, fields: 'id' });
    await drive.permissions.create({ fileId: folder.data.id, requestBody: { role: 'writer', type: 'anyone' } });
    return folder.data.id;
}

async function uploadToDrive(filePath, fileName, parentId, isFinal) {
    const media = { body: fs.createReadStream(filePath) }; 
    const res = await drive.files.create({ resource: { name: fileName, parents: [parentId] }, media: media, fields: 'id, webViewLink' });
    
    await drive.permissions.create({ fileId: res.data.id, requestBody: { role: 'writer', type: 'anyone' } });
    
    if (isFinal) {
        await drive.files.update({ fileId: res.data.id, requestBody: { contentRestrictions: [{ readOnly: true, reason: 'Documento Finalizado' }] } });
    }
    return { id: res.data.id, link: res.data.webViewLink };
}

function normalizarArchivos(datosAntiguos) {
    if (!datosAntiguos) return [];
    if (typeof datosAntiguos === 'string' && datosAntiguos.trim().startsWith('/uploads')) {
        return [{ nombre: datosAntiguos.split('/').pop(), url_local: datosAntiguos }];
    }
    try {
        let lista = JSON.parse(datosAntiguos);
        if (!Array.isArray(lista)) return [];
        return lista.map(a => {
            if (a.url && !a.url_local) { a.url_local = a.url; delete a.url; }
            if (!a.nombre && a.url_local) { a.nombre = a.url_local.split('/').pop(); }
            return a;
        });
    } catch (e) { return []; }
}

async function sincronizarArchivos() {
    console.log("🚀 Iniciando escaneo adaptativo de archivos antiguos...");
    
    try {
        const result = await pool.query('SELECT * FROM expedientes');
        const expedientes = result.rows;
        let totalSubidos = 0;

        for (const exp of expedientes) {
            let editables = normalizarArchivos(exp.archivos_editables);
            let finales = normalizarArchivos(exp.archivos_finales);
            let necesitaActualizar = false;

            for (let i = 0; i < editables.length; i++) {
                const archivo = editables[i];
                if (archivo.url_local && !archivo.url_drive) {
                    console.log(`⏳ Subiendo Borrador: ${archivo.nombre || 'Archivo'} (Exp: ${exp.nro_expediente})`);
                    const rutaFisica = path.join(__dirname, decodeURIComponent(archivo.url_local));
                    
                    if (fs.existsSync(rutaFisica)) {
                        const tipoCarpeta = exp.tipo_expediente || 'Otros';
                        const expCarpeta = exp.nro_expediente.replace(/[/\\?%*:|"<>]/g, '-');
                        const tipoCarpetaId = await getOrCreateFolder(tipoCarpeta, FOLDER_BASE_ID);
                        const expCarpetaId = await getOrCreateFolder(expCarpeta, tipoCarpetaId);

                        const uploadDrive = await uploadToDrive(rutaFisica, archivo.nombre, expCarpetaId, false);
                        editables[i].url_drive = uploadDrive.link;
                        editables[i].drive_id = uploadDrive.id;
                        necesitaActualizar = true;
                        totalSubidos++;
                        console.log(`✅ ¡Subido con éxito!`);
                    }
                }
            }

            for (let i = 0; i < finales.length; i++) {
                const archivo = finales[i];
                if (archivo.url_local && !archivo.url_drive) {
                    console.log(`⏳ Subiendo Finalizado: ${archivo.nombre || 'Archivo'} (Exp: ${exp.nro_expediente})`);
                    const rutaFisica = path.join(__dirname, decodeURIComponent(archivo.url_local));
                    
                    if (fs.existsSync(rutaFisica)) {
                        const tipoCarpeta = exp.tipo_expediente || 'Otros';
                        const expCarpeta = exp.nro_expediente.replace(/[/\\?%*:|"<>]/g, '-');
                        const tipoCarpetaId = await getOrCreateFolder(tipoCarpeta, FOLDER_BASE_ID);
                        const expCarpetaId = await getOrCreateFolder(expCarpeta, tipoCarpetaId);

                        const uploadDrive = await uploadToDrive(rutaFisica, archivo.nombre, expCarpetaId, true);
                        finales[i].url_drive = uploadDrive.link;
                        finales[i].drive_id = uploadDrive.id;
                        necesitaActualizar = true;
                        totalSubidos++;
                        console.log(`✅ ¡Subido y bloqueado con éxito!`);
                    }
                }
            }

            if (necesitaActualizar) {
                await pool.query('UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3', [JSON.stringify(editables), JSON.stringify(finales), exp.id]);
                console.log(`💾 Base de datos actualizada para el expediente ${exp.nro_expediente} al nuevo formato.`);
            }
        }
        
        console.log(`\n🎉 ¡Sincronización completada! Se subieron ${totalSubidos} archivos antiguos a Drive.`);
        process.exit(0);

    } catch (error) {
        console.error("🚨 Error durante la sincronización:", error);
        process.exit(1);
    }
}

sincronizarArchivos();