const pool = require('../config/db');
const { registrarAuditoria } = require('../services/auditoria.service');

const obtenerAuditoria = async (req, res) => {
    try {
        const { mes, anio } = req.query;
        const targetMes = mes ? parseInt(mes) : new Date().getMonth() + 1;
        const targetAnio = anio ? parseInt(anio) : new Date().getFullYear();

        const query = `
            SELECT * FROM (
                SELECT DISTINCT ON (COALESCE(registro_id::VARCHAR, registro_afectado)) *
                FROM auditoria_general
                WHERE modulo = 'EXPEDIENTES' 
                AND registro_afectado IS NOT NULL 
                AND registro_afectado != ''
                AND EXTRACT(MONTH FROM fecha_hora) = $1
                AND EXTRACT(YEAR FROM fecha_hora) = $2
                ORDER BY COALESCE(registro_id::VARCHAR, registro_afectado), fecha_hora DESC
            ) t
            ORDER BY fecha_hora DESC
            LIMIT 500
        `;
        const result = await pool.query(query, [targetMes, targetAnio]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error interno al obtener auditoría" });
    }
};

const crearEventoAuditoria = async (req, res) => {
    try {
        const { modulo, accion, registro_afectado, detalle, registro_id } = req.body;
        await registrarAuditoria(req, null, null, modulo, accion, registro_afectado, detalle, registro_id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar evento" });
    }
};

module.exports = { obtenerAuditoria, crearEventoAuditoria };