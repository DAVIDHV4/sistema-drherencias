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

const frontendPath = path.join(__dirname, '../client');
app.use(express.static(frontendPath));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(uploadDir));

app.get('/api/crear-hash/:password', async (req, res) => {
    const { password } = req.params;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    res.json({ original: password, encriptada: hash });
});

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }
        const user = result.rows[0];
        const esCorrecta = await bcrypt.compare(password, user.password);
        if (esCorrecta) {
            res.json({ mensaje: "Login exitoso", usuario: user.usuario });
        } else {
            res.status(401).json({ error: "Contraseña incorrecta" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.get('/api/expedientes', async (req, res) => {
    try {
        const { busqueda, categoria } = req.query;
        let sql = "SELECT * FROM expedientes WHERE 1=1";
        const values = [];
        let counter = 1;
        if (categoria) {
            sql += ` AND categoria = $${counter}`;
            values.push(categoria);
            counter++;
        }
        if (busqueda) {
            sql += ` AND (demandante ILIKE $${counter} OR dni_demandante ILIKE $${counter} OR nro_expediente ILIKE $${counter} OR demandado ILIKE $${counter})`;
            values.push(`%${busqueda}%`);
            counter++;
        }
        sql += " ORDER BY fecha_registro DESC";
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error("Error SQL:", err.message);
        res.status(500).json({ error: "Error al obtener expedientes" });
    }
});

app.post('/api/expedientes', upload.single('archivo'), async (req, res) => {
    try {
        const data = req.body;
        const archivoPath = req.file ? `/uploads/${req.file.filename}` : null;
        const sql = `INSERT INTO expedientes (nro_expediente, demandante, dni_demandante, demandado, dni_demandado, juzgado, abogado_encargado, detalle, categoria, archivo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
        const values = [data.nro_expediente, data.cliente, data.dni_cliente, data.caso, data.dni_procurador, data.proceso_administrativo, data.procurador, data.observaciones, data.categoria, archivoPath];
        const newExpediente = await pool.query(sql, values);
        res.json(newExpediente.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar expediente" });
    }
});

app.put('/api/expedientes/:id', upload.single('archivo'), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        let archivoPath = req.file ? `/uploads/${req.file.filename}` : null;
        let sql = `UPDATE expedientes SET demandante=$1, dni_demandante=$2, demandado=$3, dni_demandado=$4, juzgado=$5, abogado_encargado=$6, detalle=$7, categoria=$8`;
        const values = [data.cliente, data.dni_cliente, data.caso, data.dni_procurador, data.proceso_administrativo, data.procurador, data.observaciones, data.categoria];
        let counter = 9;
        if (archivoPath) {
            sql += `, archivo_url=$${counter}`;
            values.push(archivoPath);
            counter++;
        } else if (data.eliminar_archivo === 'true') {
            sql += `, archivo_url=NULL`;
        }
        sql += ` WHERE nro_expediente=$${counter} RETURNING *`;
        values.push(id);
        const updatedExpediente = await pool.query(sql, values);
        if (updatedExpediente.rows.length === 0) {
            return res.status(404).json({ error: "Expediente no encontrado" });
        }
        res.json(updatedExpediente.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar expediente" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});