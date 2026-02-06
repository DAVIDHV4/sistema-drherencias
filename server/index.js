const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(uploadDir));

const limpiar = (valor) => {
    if (valor === 'undefined' || valor === 'null' || valor === '' || valor === undefined || valor === null) {
        return null;
    }
    return valor;
};

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }
        const user = result.rows[0];
        if (password.trim() === user.password.trim()) {
            res.json({ mensaje: "Login exitoso", usuario: user.usuario });
        } else {
            res.status(401).json({ error: "Contraseña incorrecta" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.post('/api/expedientes', upload.single('archivo'), async (req, res) => {
    try {
        const data = req.body;
        const archivoPath = req.file ? `/uploads/${req.file.filename}` : null;
        
        const sql = `INSERT INTO expedientes (cliente, dni_cliente, direccion_cliente, caso, categoria, numero_expediente, periodo, fecha_inicio, fecha_finalizacion, estado, etapa_proceso, proceso_notarial, proceso_administrativo, procurador, dni_procurador, direccion_procurador, archivos, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`;
        
        const values = [
            limpiar(data.cliente), 
            limpiar(data.dni_cliente), 
            limpiar(data.direccion_cliente), 
            limpiar(data.caso), 
            limpiar(data.categoria), 
            limpiar(data.numero_expediente), 
            limpiar(data.periodo), 
            limpiar(data.fecha_inicio), 
            limpiar(data.fecha_finalizacion), 
            limpiar(data.estado), 
            limpiar(data.etapa_proceso), 
            limpiar(data.proceso_notarial), 
            limpiar(data.proceso_administrativo), 
            limpiar(data.procurador), 
            limpiar(data.dni_procurador), 
            limpiar(data.direccion_procurador), 
            archivoPath, 
            limpiar(data.observaciones)
        ];
        
        const newExpediente = await pool.query(sql, values);
        res.json(newExpediente.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al guardar expediente" });
    }
});

app.get('/api/expedientes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM expedientes ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener expedientes" });
    }
});

app.put('/api/expedientes/:id', upload.single('archivo'), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        let archivoPath = null;
        let borrarArchivo = data.eliminar_archivo === 'true';

        if (req.file) {
            archivoPath = `/uploads/${req.file.filename}`;
        }

        let sql, values;

        const commonValues = [
            limpiar(data.cliente), 
            limpiar(data.dni_cliente), 
            limpiar(data.direccion_cliente), 
            limpiar(data.caso), 
            limpiar(data.categoria), 
            limpiar(data.numero_expediente), 
            limpiar(data.periodo), 
            limpiar(data.fecha_inicio), 
            limpiar(data.fecha_finalizacion), 
            limpiar(data.estado), 
            limpiar(data.etapa_proceso), 
            limpiar(data.proceso_notarial), 
            limpiar(data.proceso_administrativo), 
            limpiar(data.procurador), 
            limpiar(data.dni_procurador), 
            limpiar(data.direccion_procurador)
        ];

        if (archivoPath || borrarArchivo) {
            sql = `UPDATE expedientes SET cliente=$1, dni_cliente=$2, direccion_cliente=$3, caso=$4, categoria=$5, numero_expediente=$6, periodo=$7, fecha_inicio=$8, fecha_finalizacion=$9, estado=$10, etapa_proceso=$11, proceso_notarial=$12, proceso_administrativo=$13, procurador=$14, dni_procurador=$15, direccion_procurador=$16, archivos=$17, observaciones=$18 WHERE id=$19 RETURNING *`;
            const archivoFinal = borrarArchivo ? null : archivoPath;
            values = [...commonValues, archivoFinal, limpiar(data.observaciones), id];
        } else {
            sql = `UPDATE expedientes SET cliente=$1, dni_cliente=$2, direccion_cliente=$3, caso=$4, categoria=$5, numero_expediente=$6, periodo=$7, fecha_inicio=$8, fecha_finalizacion=$9, estado=$10, etapa_proceso=$11, proceso_notarial=$12, proceso_administrativo=$13, procurador=$14, dni_procurador=$15, direccion_procurador=$16, observaciones=$17 WHERE id=$18 RETURNING *`;
            values = [...commonValues, limpiar(data.observaciones), id];
        }

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

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});