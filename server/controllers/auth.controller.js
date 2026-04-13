const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { registrarAuditoria } = require('../services/auditoria.service');

const login = async (req, res) => {
    try {
        const { usuario, password } = req.body;
        const { rows } = await pool.query('SELECT id, usuario, password, nombre FROM usuarios WHERE usuario = $1', [usuario]);
        
        if (rows.length === 0) return res.status(401).json({ error: 'Usuario no existe' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

        await registrarAuditoria(req, user.id, user.usuario, 'SISTEMA', 'LOGIN', 'SESION_INICIADA', `El usuario ingresó al sistema correctamente.`);

        res.json({ id: user.id, usuario: user.usuario, rol: user.nombre });
    } catch (error) {
        res.status(500).json({ error: 'Error en el servidor' });
    }
};

module.exports = { login };