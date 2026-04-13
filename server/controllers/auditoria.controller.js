const pool = require('../config/db');
const { registrarAuditoria } = require('../services/auditoria.service');

const obtenerAuditoria = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM auditoria_general WHERE modulo = 'EXPEDIENTES' ORDER BY fecha_hora DESC LIMIT 1000"
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error interno al obtener auditoría" });
    }
};

const crearEventoAuditoria = async (req, res) => {
    try {
        const { modulo, accion, registro_afectado, detalle } = req.body;
        await registrarAuditoria(req, null, null, modulo, accion, registro_afectado, detalle);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar evento" });
    }
};

module.exports = { obtenerAuditoria, crearEventoAuditoria };