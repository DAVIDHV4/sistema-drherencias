const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, '../dist');
app.use(express.static(frontendPath));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const nombreOriginal = file.originalname.replace(/\s+/g, '_');
        cb(null, nombreOriginal);
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(uploadDir));

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length === 0) return res.status(401).json({ error: "Usuario no encontrado" });
        const user = result.rows[0];
        const esCorrecta = await bcrypt.compare(password, user.password);
        if (esCorrecta) res.json({ mensaje: "Login exitoso", usuario: user.usuario });
        else res.status(401).json({ error: "Contraseña incorrecta" });
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.get('/api/expedientes', async (req, res) => {
    try {
        const { busqueda, categoria, tipo_expediente } = req.query;
        let sql = "SELECT * FROM expedientes WHERE 1=1";
        const values = [];
        let counter = 1;

        if (tipo_expediente) {
            sql += ` AND tipo_expediente = $${counter}`;
            values.push(tipo_expediente);
            counter++;
        }
        if (categoria) {
            sql += ` AND categoria = $${counter}`;
            values.push(categoria);
            counter++;
        }
        if (busqueda) {
            sql += ` AND (solicitante ILIKE $${counter} OR nro_expediente ILIKE $${counter} OR dni_solicitante ILIKE $${counter} OR CAST(id AS TEXT) ILIKE $${counter})`;
            values.push(`%${busqueda}%`);
            counter++;
        }

        sql += " ORDER BY id DESC";
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener expedientes" });
    }
});

app.post('/api/expedientes', upload.array('archivos', 10), async (req, res) => {
    try {
        const data = req.body;
        const existe = await pool.query('SELECT id FROM expedientes WHERE nro_expediente = $1', [data.nro_expediente]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: "El número de expediente ya existe en el sistema." });
        }

        let listaArchivos = [];
        if (req.files && req.files.length > 0) {
            listaArchivos = req.files.map(f => ({
                nombre: f.originalname,
                url: `/uploads/${f.filename}`
            }));
        }
        const archivosJSON = JSON.stringify(listaArchivos);

        const sql = `INSERT INTO expedientes (tipo_expediente, nro_expediente, solicitante, dni_solicitante, juzgado, abogado_encargado, materia, categoria, archivo_url, estado, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
        const values = [
            data.tipo_expediente, data.nro_expediente, data.solicitante, 
            data.dni_solicitante, data.juzgado, data.abogado_encargado, 
            data.materia, data.categoria, archivosJSON, data.estado || 'En Trámite', data.observaciones || ''
        ];
        const newExpediente = await pool.query(sql, values);
        res.json(newExpediente.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar" });
    }
});

app.put('/api/expedientes/:id', upload.array('archivos', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const existe = await pool.query('SELECT id FROM expedientes WHERE nro_expediente = $1 AND id <> $2', [data.nro_expediente, id]);
        if (existe.rows.length > 0) {
            return res.status(400).json({ error: "No puedes usar ese número de expediente, ya está asignado a otro registro." });
        }

        let archivosFinales = [];
        if (data.archivos_previos) {
            try {
                archivosFinales = JSON.parse(data.archivos_previos);
            } catch (e) {
                if (typeof data.archivos_previos === 'string' && data.archivos_previos.startsWith('/uploads')) {
                    archivosFinales = [{ nombre: 'Archivo Anterior', url: data.archivos_previos }];
                }
            }
        }

        if (req.files && req.files.length > 0) {
            const nuevos = req.files.map(f => ({
                nombre: f.originalname,
                url: `/uploads/${f.filename}`
            }));
            archivosFinales = [...archivosFinales, ...nuevos];
        }

        const archivosJSON = JSON.stringify(archivosFinales);

        const sql = `UPDATE expedientes SET tipo_expediente=$1, solicitante=$2, dni_solicitante=$3, juzgado=$4, abogado_encargado=$5, materia=$6, categoria=$7, nro_expediente=$8, estado=$9, observaciones=$10, archivo_url=$11 WHERE id=$12 RETURNING *`;
        
        const values = [
            data.tipo_expediente, data.solicitante, data.dni_solicitante, 
            data.juzgado, data.abogado_encargado, data.materia, 
            data.categoria, data.nro_expediente, data.estado, 
            data.observaciones, archivosJSON, id
        ];

        const result = await pool.query(sql, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar" });
    }
});

app.get('/api/expedientes/buscar-global', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);
        const sql = `SELECT * FROM expedientes WHERE nro_expediente ILIKE $1 OR solicitante ILIKE $1 OR dni_solicitante ILIKE $1 OR CAST(id AS TEXT) ILIKE $1 ORDER BY id DESC`;
        const result = await pool.query(sql, [`%${query}%`]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en búsqueda global" });
    }
});

app.use((req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });
app.listen(PORT, () => { console.log(`🚀 Servidor listo en puerto ${PORT}`); });