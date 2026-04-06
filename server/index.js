require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { google } = require('googleapis');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, '../dist');
app.use(express.static(frontendPath));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        let nombreCorregido = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/\s+/g, '_');
        cb(null, Date.now() + '_' + nombreCorregido);
    }
});
const upload = multer({ storage: storage });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET; 
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
const FOLDER_BASE_ID = process.env.GOOGLE_FOLDER_BASE_ID;

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

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });
        const esCorrecta = await bcrypt.compare(password, result.rows[0].password);
        if (esCorrecta) res.json({ mensaje: "Login exitoso", usuario: result.rows[0].usuario }); else res.status(401).json({ error: "Error" });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
});

app.get('/api/expedientes', async (req, res) => {
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
});

app.get('/api/expedientes/buscar-global', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.json([]);
    try {
        const searchParam = `%${query}%`;
        const sql = `SELECT * FROM expedientes WHERE nro_expediente ILIKE $1 OR solicitante ILIKE $1 OR dni_solicitante ILIKE $1 ORDER BY id DESC LIMIT 50`;
        const result = await pool.query(sql, [searchParam]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post('/api/expedientes', upload.fields([{ name: 'editables' }, { name: 'finales' }]), async (req, res) => {
    try {
        const data = req.body;
        const existe = await pool.query('SELECT id FROM expedientes WHERE nro_expediente = $1', [data.nro_expediente]);
        if (existe.rows.length > 0) return res.status(400).json({ error: "Ya existe." });

        const resultInsert = await pool.query(`INSERT INTO expedientes (tipo_expediente, nro_expediente, solicitante, dni_solicitante, juzgado, abogado_encargado, materia, categoria, estado, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`, [data.tipo_expediente, data.nro_expediente, data.solicitante, data.dni_solicitante, data.juzgado, data.abogado_encargado, data.materia, data.categoria, data.estado || 'En Trámite', data.observaciones || '']);
        const nuevoId = resultInsert.rows[0].id;

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
});

app.put('/api/expedientes/:id', upload.fields([{ name: 'editables' }, { name: 'finales' }]), async (req, res) => {
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

        res.json((await pool.query(`UPDATE expedientes SET tipo_expediente=$1, solicitante=$2, dni_solicitante=$3, juzgado=$4, abogado_encargado=$5, materia=$6, categoria=$7, nro_expediente=$8, estado=$9, observaciones=$10, archivos_editables=$11, archivos_finales=$12 WHERE id=$13 RETURNING *`, [data.tipo_expediente, data.solicitante, data.dni_solicitante, data.juzgado, data.abogado_encargado, data.materia, data.categoria, data.nro_expediente, data.estado, data.observaciones, JSON.stringify(listaEditables), JSON.stringify(listaFinales), id])).rows[0]);
    } catch (err) { res.status(500).json({ error: "Error interno del servidor" }); }
});

app.post('/api/expedientes/:id/archivos-rapidos', upload.fields([{ name: 'editables' }, { name: 'finales' }]), async (req, res) => {
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
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
});

app.put('/api/expedientes/:id/marcar-final', async (req, res) => {
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
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
});

app.put('/api/expedientes/:id/desmarcar-final', async (req, res) => {
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
                const localPath = path.join(__dirname, decodeURIComponent(archivo.url_local));
                if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
                delete archivo.url_local; 
            }
            editables.push(archivo);
            await pool.query('UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3', [JSON.stringify(editables), JSON.stringify(finales), id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
});

app.put('/api/expedientes/:id/eliminar-archivo', async (req, res) => {
    try {
        const { id } = req.params; 
        const { drive_id, nombre, tipo, url_local } = req.body;
        if (drive_id) { try { await drive.files.delete({ fileId: drive_id }); } catch(e) {} }
        if (url_local) {
            const localPath = path.join(__dirname, decodeURIComponent(url_local));
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
        const exp = (await pool.query('SELECT archivos_editables, archivos_finales FROM expedientes WHERE id = $1', [id])).rows[0];
        let editables = parseLista(exp.archivos_editables);
        let finales = parseLista(exp.archivos_finales);

        if (tipo === 'editables') editables = editables.filter(a => a.nombre !== nombre);
        else finales = finales.filter(a => a.nombre !== nombre);

        await pool.query('UPDATE expedientes SET archivos_editables = $1, archivos_finales = $2 WHERE id = $3', [JSON.stringify(editables), JSON.stringify(finales), id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Error interno" }); }
});

app.get('/api/descargar', async (req, res) => {
    try {
        const { ruta } = req.query;
        if (!ruta) return res.status(400).json({ error: "Ruta no especificada" });
        const rutaDecodificada = decodeURIComponent(ruta);
        const rutaFisica = path.join(__dirname, rutaDecodificada);
        if (!rutaFisica.startsWith(__dirname)) return res.status(403).json({ error: "Acceso denegado" });
        if (!fs.existsSync(rutaFisica)) return res.status(404).json({ error: "El archivo no existe" });
        res.download(rutaFisica);
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
});

app.get('/api/citas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM citas ORDER BY fecha DESC, hora DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
});

app.post('/api/citas', async (req, res) => {
    try {
        const { fecha, hora, solicitante, motivo, generarMeet } = req.body;
        const startDateTime = new Date(`${fecha}T${hora}:00-05:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

        const event = {
            summary: solicitante,
            description: motivo,
            start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Lima' },
            end: { dateTime: endDateTime.toISOString(), timeZone: 'America/Lima' },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 60 },
                    { method: 'popup', minutes: 15 }
                ]
            }
        };

        if (generarMeet) {
            event.conferenceData = {
                createRequest: {
                    requestId: `meet-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            };
        }

        const calendarRes = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: generarMeet ? 1 : 0
        });

        const enlace_meet = generarMeet ? calendarRes.data.hangoutLink : null;
        const google_event_id = calendarRes.data.id; 

        const newCita = await pool.query(
            `INSERT INTO citas (fecha, hora, solicitante, motivo, enlace_meet, google_event_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [fecha, hora, solicitante, motivo, enlace_meet, google_event_id]
        );

        res.json(newCita.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error al crear la cita" });
    }
});

app.put('/api/citas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { fecha, hora, solicitante, motivo } = req.body;
        
        const citaDb = await pool.query('SELECT google_event_id FROM citas WHERE id=$1', [id]);
        const eventId = citaDb.rows.length > 0 ? citaDb.rows[0].google_event_id : null;

        if (eventId) {
            const startDateTime = new Date(`${fecha}T${hora}:00-05:00`);
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
            
            try {
                await calendar.events.patch({
                    calendarId: 'primary',
                    eventId: eventId,
                    resource: {
                        summary: solicitante,
                        description: motivo,
                        start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Lima' },
                        end: { dateTime: endDateTime.toISOString(), timeZone: 'America/Lima' }
                    }
                });
            } catch (e) {} 
        }

        const result = await pool.query(
            'UPDATE citas SET fecha=$1, hora=$2, solicitante=$3, motivo=$4 WHERE id=$5 RETURNING *',
            [fecha, hora, solicitante, motivo, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
});

app.delete('/api/citas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const citaDb = await pool.query('SELECT google_event_id FROM citas WHERE id=$1', [id]);
        
        if (citaDb.rows.length > 0 && citaDb.rows[0].google_event_id) {
            try {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: citaDb.rows[0].google_event_id
                });
            } catch (e) {} 
        }

        await pool.query('DELETE FROM citas WHERE id=$1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
});

app.get('/api/reportes/asistencias', async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({ error: 'Faltan fechas' });
        }

        const start = new Date(fechaInicio);
        const end = new Date(fechaFin);
        const fechasRango = [];
        
        let curr = new Date(start.getTime() + start.getTimezoneOffset() * 60000); 
        const endAdjusted = new Date(end.getTime() + end.getTimezoneOffset() * 60000);

        while (curr <= endAdjusted) {
            fechasRango.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        const query = `
            SELECT 
                u.id AS empleado_id,
                u.nombres,
                u.apellido_paterno,
                u.apellido_materno,
                u.nombre AS departamento,
                a.fecha_hora
            FROM asistencias a
            INNER JOIN usuarios u ON a.empleado_id = u.id
            WHERE DATE(a.fecha_hora) >= $1 AND DATE(a.fecha_hora) <= $2
            ORDER BY u.id, a.fecha_hora ASC
        `;
        const { rows } = await pool.query(query, [fechaInicio, fechaFin]);

        const reporteData = {};

        rows.forEach(row => {
            const id = row.empleado_id;
            if (!reporteData[id]) {
                reporteData[id] = {
                    id: id,
                    nombre: `${row.apellido_paterno || ''} ${row.apellido_materno || ''} ${row.nombres || ''}`.trim().toUpperCase(),
                    departamento: row.departamento || 'Clinica',
                    marcaciones: {}
                };
            }

            const dateObj = new Date(row.fecha_hora);
            const dateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            const timeStr = dateObj.toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit', 
                timeZone: 'America/Lima' 
            });

            if (!reporteData[id].marcaciones[dateStr]) {
                reporteData[id].marcaciones[dateStr] = [];
            }
            reporteData[id].marcaciones[dateStr].push(timeStr);
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Asistencias');

        const columnasExcel = [
            { header: 'Employee ID', key: 'id', width: 15 },
            { header: 'Name', key: 'nombre', width: 40 },
            { header: 'Department', key: 'departamento', width: 20 }
        ];

        fechasRango.forEach(fechaStr => {
            const dia = fechaStr.split('-')[2]; 
            columnasExcel.push({ header: dia, key: fechaStr, width: 12 });
        });

        worksheet.columns = columnasExcel;

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF194276' } }; 
        worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

        Object.values(reporteData).forEach(emp => {
            const fila = {
                id: emp.id,
                nombre: emp.nombre,
                departamento: emp.departamento
            };

            fechasRango.forEach(fechaStr => {
                if (emp.marcaciones[fechaStr]) {
                    fila[fechaStr] = emp.marcaciones[fechaStr].join('\n');
                } else {
                    fila[fechaStr] = ''; 
                }
            });

            const filaAgregada = worksheet.addRow(fila);

            filaAgregada.eachCell({ includeEmpty: true }, (cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_Asistencias_${fechaInicio}_al_${fechaFin}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error en reporte:", error);
        res.status(500).json({ error: 'Error al generar el Excel' });
    }
});

app.use((req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });
app.listen(PORT, () => { console.log(`🚀 Servidor listo en puerto ${PORT}`); });