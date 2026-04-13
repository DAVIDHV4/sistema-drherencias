const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { registrarAuditoria, obtenerUsuarioReq } = require('../services/auditoria.service');

const obtenerUsuarios = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, usuario, nombre, dni, nombres, apellido_paterno, apellido_materno, fecha_creacion FROM usuarios ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

const crearUsuario = async (req, res) => {
    try {
        const { usuario, password, nombre, dni, nombres, apellido_paterno, apellido_materno } = req.body;
        const userExist = await pool.query('SELECT id FROM usuarios WHERE usuario = $1 OR dni = $2', [usuario, dni]);
        if (userExist.rows.length > 0) return res.status(400).json({ error: "El nombre de usuario o DNI ya está registrado." });
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO usuarios (usuario, password, nombre, fecha_creacion, dni, nombres, apellido_paterno, apellido_materno) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7) RETURNING id`,
            [usuario.toUpperCase(), hashedPassword, nombre, dni, nombres.toUpperCase(), apellido_paterno.toUpperCase(), apellido_materno.toUpperCase()]
        );
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'USUARIOS', 'CREAR', usuario.toUpperCase(), 'Creó un nuevo usuario en el sistema');
        res.json({ id: result.rows[0].id, success: true });
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

const editarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario, password, nombre, dni, nombres, apellido_paterno, apellido_materno } = req.body;
        const userExist = await pool.query('SELECT id FROM usuarios WHERE (usuario = $1 OR dni = $2) AND id <> $3', [usuario, dni, id]);
        if (userExist.rows.length > 0) return res.status(400).json({ error: "El nombre de usuario o DNI ya está en uso." });
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                `UPDATE usuarios SET usuario=$1, password=$2, nombre=$3, dni=$4, nombres=$5, apellido_paterno=$6, apellido_materno=$7 WHERE id=$8`,
                [usuario.toUpperCase(), hashedPassword, nombre, dni, nombres.toUpperCase(), apellido_paterno.toUpperCase(), apellido_materno.toUpperCase(), id]
            );
        } else {
            await pool.query(
                `UPDATE usuarios SET usuario=$1, nombre=$2, dni=$3, nombres=$4, apellido_paterno=$5, apellido_materno=$6 WHERE id=$7`,
                [usuario.toUpperCase(), nombre, dni, nombres.toUpperCase(), apellido_paterno.toUpperCase(), apellido_materno.toUpperCase(), id]
            );
        }
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'USUARIOS', 'EDITAR', usuario.toUpperCase(), 'Actualizó los datos del usuario');
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === '1') return res.status(403).json({ error: "No se puede eliminar al administrador." });
        const userDb = await pool.query('SELECT usuario FROM usuarios WHERE id=$1', [id]);
        const userName = userDb.rows.length > 0 ? userDb.rows[0].usuario : `ID ${id}`;
        await pool.query('DELETE FROM usuarios WHERE id=$1', [id]);
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'USUARIOS', 'ELIMINAR', userName, 'Eliminó el usuario del sistema');
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

module.exports = { obtenerUsuarios, crearUsuario, editarUsuario, eliminarUsuario };