const pool = require('../config/db');

const registrarAuditoria = async (req, p_id, p_login, modulo, accion, registro_afectado, detalle, registro_id = null) => {
    try {
        const ip_cliente = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Desconocida';
        const dispositivo = req.headers['user-agent'] || 'Desconocido';
        const usuario_login = req.headers['x-usuario'] || p_login || 'SISTEMA';

        await pool.query(
            `INSERT INTO auditoria_general (usuario_login, modulo, accion, registro_afectado, detalle, ip_cliente, dispositivo, registro_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [usuario_login, modulo, accion, registro_afectado, detalle, ip_cliente, dispositivo, registro_id]
        );
    } catch (error) {
        console.error(error);
    }
};

const obtenerUsuarioReq = (req) => {
    return req.headers['x-usuario'] || 'SISTEMA';
};

module.exports = { registrarAuditoria, obtenerUsuarioReq };