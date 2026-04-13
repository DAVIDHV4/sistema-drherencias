const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const { drive, FOLDER_BASE_ID } = require('../services/google.service');
const { registrarAuditoria, obtenerUsuarioReq } = require('../services/auditoria.service');

const uploadDir = path.join(__dirname, '../uploads');
const folderCache = {};

async function getOrCreateFolder(folderName, parentId) {
    const cacheKey = `${parentId}_${folderName}`;
    if (folderCache[cacheKey]) return folderCache[cacheKey];
    const res = await drive.files.list({ q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`, fields: 'files(id, name)' });
    if (res.data.files.length > 0) {
        folderCache[cacheKey] = res.data.files[0].id;
        return res.data.files[0].id;
    }
    const folder = await drive.files.create({ resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] }, fields: 'id' });
    await drive.permissions.create({ fileId: folder.data.id, requestBody: { role: 'writer', type: 'anyone' } });
    folderCache[cacheKey] = folder.data.id;
    return folder.data.id;
}

async function uploadToDrive(filePath, fileName, mimeType, parentId, isFinal = false) {
    const media = { mimeType: mimeType, body: fs.createReadStream(filePath) };
    const res = await drive.files.create({ resource: { name: fileName, parents: [parentId] }, media: media, fields: 'id, webViewLink' });
    await drive.permissions.create({ fileId: res.data.id, requestBody: { role: 'writer', type: 'anyone' } });
    if (isFinal) {
        await drive.files.update({ fileId: res.data.id, requestBody: { contentRestrictions: [{ readOnly: true, reason: 'Documento Finalizado' }] } });
    }
    return { id: res.data.id, link: res.data.webViewLink };
}

const parseLista = (val) => {
    if (!val) return [];
    if (typeof val === 'string') { try { return JSON.parse(val); } catch(e){ return []; } }
    return Array.isArray(val) ? val : [];
};

const obtenerExpedientes = async (req, res) => {
    try {
        const { busqueda, categoria, tipo_expediente, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let whereClause = " WHERE 1=1"; 
        const values = []; 
        let counter = 1;
        if (tipo_expediente) { whereClause += ` AND tipo_expediente = $${counter}`; values.push(tipo_expediente); counter++; }
        if (categoria) { whereClause += ` AND categoria = $${counter}`; values.push(categoria); counter++; }
        if (busqueda) { whereClause += ` AND (solicitante ILIKE $${counter} OR CAST(nro_expediente AS TEXT) ILIKE $${counter} OR dni_solicitante ILIKE $${counter} OR CAST(id AS TEXT) ILIKE $${counter})`; values.push(`%${busqueda}%`); counter++; }
        const countRes = await pool.query(`SELECT COUNT(*) FROM expedientes ${whereClause}`, values);
        const total = parseInt(countRes.rows[0].count);
        const sql = `SELECT * FROM expedientes ${whereClause} ORDER BY id DESC LIMIT $${counter} OFFSET $${counter + 1}`;
        const queryValues = [...values, limit, offset];
        const result = await pool.query(sql, queryValues);
        res.json({ data: result.rows, total: total, paginaActual: parseInt(page), totalPaginas: Math.ceil(total / limit) });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
};

const buscarGlobal = async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    try {
        const searchParam = `%${query}%`;
        const sql = `SELECT * FROM expedientes WHERE nro_expediente ILIKE $1 OR solicitante ILIKE $1 OR dni_solicitante ILIKE $1 ORDER BY id DESC LIMIT 50`;
        const result = await pool.query(sql, [searchParam]);
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

const crearExpediente = async (req, res) => {
    try {
        const data = req.body;
        const existe = await pool.query('SELECT id FROM expedientes WHERE nro_expediente = $1', [data.nro_expediente]);
        if (existe.rows.length > 0) return res.status(400).json({ error: "Ya existe." });
        const resultInsert = await pool.query(`INSERT INTO expedientes (tipo_expediente, nro_expediente, solicitante, dni_solicitante, juzgado, abogado_encargado, materia, categoria, estado, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [data.tipo_expediente, data.nro_expediente, data.solicitante, data.dni_solicitante, data.juzgado, data.abogado_encargado, data.materia, data.categoria, data.estado || 'En Trámite', data.observaciones || '']);
        const nuevoId = resultInsert.rows[0].id;
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'EXPEDIENTES', 'CREAR', data.nro_expediente, 'Creó un nuevo expediente', nuevoId);
        let listaEditables = [], listaFinales = [];
        if (req.files && (req.files['editables'] || req.files['finales'])) {
            const tipoCarpeta = data.tipo_expediente || 'Otros';
            const expCarpeta = String(data.nro_expediente).replace(/[/\\?%*:|"<>]/g, '-');
            const localFolderPath = path.join(uploadDir, tipoCarpeta, expCarpeta);
            if (!fs.existsSync(localFolderPath)) { fs.mkdirSync(localFolderPath, { recursive: true }); }
            const tipoCarpetaId = await getOrCreateFolder(tipoCarpeta, FOLDER_BASE_ID);
            const expCarpetaId = await getOrCreateFolder(expCarpeta, tipoCarpetaId);
            const promesasEditables = (req.files['editables'] || []).map(async (f) => {
                const nombreUtf8 = Buffer.from(f.originalname, 'latin1').toString('utf8');
                const uploadDrive = await uploadToDrive(f.path, nombreUtf8, f.mimetype, expCarpetaId, false);
                fs.unlinkSync(f.path);
                return { nombre: nombreUtf8, url_drive: uploadDrive.link, drive_id: uploadDrive.id };
            });
            const promesasFinales = (req.files['finales'] || []).map(async (f) => {
                const nombreUtf8 = Buffer.from(f.originalname, 'latin1').toString('utf8');
                const newLocalPath = path.join(localFolderPath, nombreUtf8); fs.renameSync(f.path, newLocalPath);
                const uploadDrive = await uploadToDrive(newLocalPath, nombreUtf8, f.mimetype, expCarpetaId, true);
                return { nombre: nombreUtf8, url_local: `/uploads/${encodeURIComponent(tipoCarpeta)}/${encodeURIComponent(expCarpeta)}/${encodeURIComponent(nombreUtf8)}`, url_drive: uploadDrive.link, drive_id: uploadDrive.id };
            });
            listaEditables = await Promise.all(promesasEditables);
            listaFinales = await Promise.all(promesasFinales);
            await pool.query(`UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3`, [JSON.stringify(listaEditables), JSON.stringify(listaFinales), nuevoId]);
        }
        res.json({ id: nuevoId });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
};

const editarExpediente = async (req, res) => {
    try {
        const { id } = req.params; 
        const data = req.body;
        const existe = await pool.query('SELECT id FROM expedientes WHERE nro_expediente = $1 AND id <> $2', [data.nro_expediente, id]);
        if (existe.rows.length > 0) return res.status(400).json({ error: "Ya existe." });
        let listaEditables = parseLista(data.editables_previos || data.archivos_editables);
        let listaFinales = parseLista(data.finales_previos || data.archivos_finales);
        if (req.files && (req.files['editables'] || req.files['finales'])) {
            const tipoCarpeta = data.tipo_expediente || 'Otros';
            const expCarpeta = data.nro_expediente ? String(data.nro_expediente).replace(/[/\\?%*:|"<>]/g, '-') : `EXP-${id}`;
            const localFolderPath = path.join(uploadDir, tipoCarpeta, expCarpeta);
            if (!fs.existsSync(localFolderPath)) { fs.mkdirSync(localFolderPath, { recursive: true }); }
            const tipoCarpetaId = await getOrCreateFolder(tipoCarpeta, FOLDER_BASE_ID);
            const expCarpetaId = await getOrCreateFolder(expCarpeta, tipoCarpetaId);
            const promesasEditables = (req.files['editables'] || []).map(async (f) => {
                const nombreUtf8 = Buffer.from(f.originalname, 'latin1').toString('utf8');
                const uploadDrive = await uploadToDrive(f.path, nombreUtf8, f.mimetype, expCarpetaId, false);
                fs.unlinkSync(f.path);
                return { nombre: nombreUtf8, url_drive: uploadDrive.link, drive_id: uploadDrive.id };
            });
            const promesasFinales = (req.files['finales'] || []).map(async (f) => {
                const nombreUtf8 = Buffer.from(f.originalname, 'latin1').toString('utf8');
                const newLocalPath = path.join(localFolderPath, nombreUtf8); fs.renameSync(f.path, newLocalPath);
                const uploadDrive = await uploadToDrive(newLocalPath, nombreUtf8, f.mimetype, expCarpetaId, true);
                return { nombre: nombreUtf8, url_local: `/uploads/${encodeURIComponent(tipoCarpeta)}/${encodeURIComponent(expCarpeta)}/${encodeURIComponent(nombreUtf8)}`, url_drive: uploadDrive.link, drive_id: uploadDrive.id };
            });
            listaEditables.push(...(await Promise.all(promesasEditables)));
            listaFinales.push(...(await Promise.all(promesasFinales)));
        }
        const expActualizado = await pool.query(`UPDATE expedientes SET tipo_expediente=$1, solicitante=$2, dni_solicitante=$3, juzgado=$4, abogado_encargado=$5, materia=$6, categoria=$7, nro_expediente=$8, estado=$9, observaciones=$10, archivos_editables=$11, archivos_finales=$12 WHERE id=$13 RETURNING *`, [data.tipo_expediente, data.solicitante, data.dni_solicitante, data.juzgado, data.abogado_encargado, data.materia, data.categoria, data.nro_expediente, data.estado, data.observaciones, JSON.stringify(listaEditables), JSON.stringify(listaFinales), id]);
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'EXPEDIENTES', 'EDITAR', data.nro_expediente, 'Actualizó información del expediente', id);
        res.json(expActualizado.rows[0]);
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
};

const agregarArchivosRapidos = async (req, res) => {
    try {
        const { id } = req.params;
        const exp = (await pool.query('SELECT * FROM expedientes WHERE id = $1', [id])).rows[0];
        const tipoCarpeta = exp.tipo_expediente || 'Otros';
        const expCarpeta = String(exp.nro_expediente).replace(/[/\\?%*:|"<>]/g, '-');
        const localFolderPath = path.join(uploadDir, tipoCarpeta, expCarpeta);
        if (!fs.existsSync(localFolderPath)) { fs.mkdirSync(localFolderPath, { recursive: true }); }
        const tipoCarpetaId = await getOrCreateFolder(tipoCarpeta, FOLDER_BASE_ID);
        const expCarpetaId = await getOrCreateFolder(expCarpeta, tipoCarpetaId);
        let listaEditables = parseLista(exp.archivos_editables);
        let listaFinales = parseLista(exp.archivos_finales);
        const promesasEditables = (req.files && req.files['editables'] ? req.files['editables'] : []).map(async (f) => {
            const n = Buffer.from(f.originalname, 'latin1').toString('utf8');
            const u = await uploadToDrive(f.path, n, f.mimetype, expCarpetaId, false);
            fs.unlinkSync(f.path);
            return { nombre: n, url_drive: u.link, drive_id: u.id };
        });
        const promesasFinales = (req.files && req.files['finales'] ? req.files['finales'] : []).map(async (f) => {
            const n = Buffer.from(f.originalname, 'latin1').toString('utf8');
            const newPath = path.join(localFolderPath, n); fs.renameSync(f.path, newPath);
            const u = await uploadToDrive(newPath, n, f.mimetype, expCarpetaId, true);
            return { nombre: n, url_local: `/uploads/${encodeURIComponent(tipoCarpeta)}/${encodeURIComponent(expCarpeta)}/${encodeURIComponent(n)}`, url_drive: u.link, drive_id: u.id };
        });
        listaEditables.push(...(await Promise.all(promesasEditables)));
        listaFinales.push(...(await Promise.all(promesasFinales)));
        await pool.query('UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3', [JSON.stringify(listaEditables), JSON.stringify(listaFinales), id]);
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'EXPEDIENTES', 'EDITAR', exp.nro_expediente, 'Agregó archivos rápidos al expediente', id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
};

const marcarFinal = async (req, res) => {
    try {
        const { id } = req.params; const { drive_id, url_drive } = req.body;
        let fId = drive_id;
        if (!fId && url_drive) { const m = url_drive.match(/\/d\/(.+?)\//); fId = m ? m[1] : null; }
        if (!fId) return res.status(400).json({error: "ID inválido"});
        await drive.files.update({ fileId: fId, requestBody: { contentRestrictions: [{ readOnly: true, reason: 'Finalizado' }] } });
        const exp = (await pool.query('SELECT * FROM expedientes WHERE id = $1', [id])).rows[0];
        let editables = parseLista(exp.archivos_editables);
        let finales = parseLista(exp.archivos_finales);
        const index = editables.findIndex(a => a.drive_id === fId || (a.url_drive && a.url_drive.includes(fId)));
        if (index !== -1) {
            const archivo = editables.splice(index, 1)[0];
            const tipoCarpeta = exp.tipo_expediente || 'Otros';
            const expCarpeta = exp.nro_expediente ? String(exp.nro_expediente).replace(/[/\\?%*:|"<>]/g, '-') : `EXP-${id}`;
            const localFolderPath = path.join(uploadDir, tipoCarpeta, expCarpeta);
            if (!fs.existsSync(localFolderPath)) { fs.mkdirSync(localFolderPath, { recursive: true }); }
            const localFilePath = path.join(localFolderPath, archivo.nombre);
            const dest = fs.createWriteStream(localFilePath);
            const driveRes = await drive.files.get({ fileId: fId, alt: 'media' }, { responseType: 'stream' });
            await new Promise((resolve, reject) => { driveRes.data.on('end', () => resolve()).on('error', err => reject(err)).pipe(dest); });
            archivo.url_local = `/uploads/${encodeURIComponent(tipoCarpeta)}/${encodeURIComponent(expCarpeta)}/${encodeURIComponent(archivo.nombre)}`;
            finales.push(archivo);
            await pool.query('UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3', [JSON.stringify(editables), JSON.stringify(finales), id]);
            await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'EXPEDIENTES', 'EDITAR', exp.nro_expediente, `Marcó como final el archivo: ${archivo.nombre}`, id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
};

const desmarcarFinal = async (req, res) => {
    try {
        const { id } = req.params; const { drive_id, url_drive } = req.body;
        let fId = drive_id;
        if (!fId && url_drive) { const m = url_drive.match(/\/d\/(.+?)\//); fId = m ? m[1] : null; }
        if (!fId) return res.status(400).json({error: "ID inválido"});
        await drive.files.update({ fileId: fId, requestBody: { contentRestrictions: [{ readOnly: false }] } });
        const exp = (await pool.query('SELECT * FROM expedientes WHERE id = $1', [id])).rows[0];
        let editables = parseLista(exp.archivos_editables);
        let finales = parseLista(exp.archivos_finales);
        const index = finales.findIndex(a => a.drive_id === fId || (a.url_drive && a.url_drive.includes(fId)));
        if (index !== -1) {
            const archivo = finales.splice(index, 1)[0];
            if (archivo.url_local) {
                const localPath = path.join(__dirname, '../', decodeURIComponent(archivo.url_local));
                if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                delete archivo.url_local; 
            }
            editables.push(archivo);
            await pool.query('UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3', [JSON.stringify(editables), JSON.stringify(finales), id]);
            await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'EXPEDIENTES', 'EDITAR', exp.nro_expediente, `Desmarcó como final el archivo: ${archivo.nombre}`, id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
};

const eliminarArchivo = async (req, res) => {
    try {
        const { id } = req.params; 
        const { drive_id, nombre, tipo, url_local } = req.body;
        if (drive_id) { try { await drive.files.delete({ fileId: drive_id }); } catch(e) {} }
        if (url_local) {
            const localPath = path.join(__dirname, '../', decodeURIComponent(url_local));
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        const exp = (await pool.query('SELECT nro_expediente, archivos_editables, archivos_finales FROM expedientes WHERE id = $1', [id])).rows[0];
        let editables = parseLista(exp.archivos_editables);
        let finales = parseLista(exp.archivos_finales);
        if (tipo === 'editables') editables = editables.filter(a => a.nombre !== nombre);
        else finales = finales.filter(a => a.nombre !== nombre);
        await pool.query('UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3', [JSON.stringify(editables), JSON.stringify(finales), id]);
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'EXPEDIENTES', 'ELIMINAR', exp.nro_expediente, `Eliminó el archivo: ${nombre}`, id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
};

const descargarArchivo = async (req, res) => {
    try {
        const { ruta } = req.query;
        if (!ruta) return res.status(400).json({ error: "Ruta no especificada" });
        const rutaDecodificada = decodeURIComponent(ruta);
        const rutaFisica = path.join(__dirname, '../', rutaDecodificada);
        if (!rutaFisica.startsWith(path.join(__dirname, '../'))) return res.status(403).json({ error: "Acceso denegado" });
        if (!fs.existsSync(rutaFisica)) return res.status(404).json({ error: "El archivo no existe" });
        res.download(rutaFisica);
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

const buscarPorNumero = async (req, res) => {
    try {
        const { nro } = req.params;
        const result = await pool.query('SELECT tipo_expediente, categoria FROM expedientes WHERE nro_expediente = $1 LIMIT 1', [nro]);
        if (result.rows.length === 0) return res.status(404).json({ error: "No encontrado" });
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

module.exports = { obtenerExpedientes, buscarGlobal, crearExpediente, editarExpediente, agregarArchivosRapidos, marcarFinal, desmarcarFinal, eliminarArchivo, descargarArchivo, buscarPorNumero };