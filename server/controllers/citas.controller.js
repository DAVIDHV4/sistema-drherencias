const pool = require('../config/db');
const { calendar } = require('../services/google.service');
const { registrarAuditoria, obtenerUsuarioReq } = require('../services/auditoria.service');

const obtenerCitas = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM citas ORDER BY fecha DESC, hora DESC');
        res.json(result.rows);
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

const crearCita = async (req, res) => {
    try {
        const { fecha, hora, solicitante, motivo, generarMeet } = req.body;
        const startDateTime = new Date(`${fecha}T${hora}:00-05:00`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        const event = {
            summary: solicitante,
            description: motivo,
            start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Lima' },
            end: { dateTime: endDateTime.toISOString(), timeZone: 'America/Lima' },
            reminders: { useDefault: false, overrides: [ { method: 'popup', minutes: 60 }, { method: 'popup', minutes: 15 } ] }
        };
        if (generarMeet) {
            event.conferenceData = { createRequest: { requestId: `meet-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } };
        }
        const calendarRes = await calendar.events.insert({ calendarId: 'primary', resource: event, conferenceDataVersion: generarMeet ? 1 : 0 });
        const enlace_meet = generarMeet ? calendarRes.data.hangoutLink : null;
        const google_event_id = calendarRes.data.id; 
        const newCita = await pool.query(
            `INSERT INTO citas (fecha, hora, solicitante, motivo, enlace_meet, google_event_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [fecha, hora, solicitante, motivo, enlace_meet, google_event_id]
        );
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'CITAS', 'CREAR', solicitante, `Agendó una cita para el ${fecha} a las ${hora}`);
        res.json(newCita.rows[0]);
    } catch (error) { res.status(500).json({ error: "Error al crear la cita" }); }
};

const editarCita = async (req, res) => {
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
                    calendarId: 'primary', eventId: eventId,
                    resource: { summary: solicitante, description: motivo, start: { dateTime: startDateTime.toISOString(), timeZone: 'America/Lima' }, end: { dateTime: endDateTime.toISOString(), timeZone: 'America/Lima' } }
                });
            } catch (e) {} 
        }
        const result = await pool.query('UPDATE citas SET fecha=$1, hora=$2, solicitante=$3, motivo=$4 WHERE id=$5 RETURNING *', [fecha, hora, solicitante, motivo, id]);
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'CITAS', 'EDITAR', solicitante, `Actualizó datos de la cita`);
        res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

const eliminarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const citaDb = await pool.query('SELECT google_event_id, solicitante FROM citas WHERE id=$1', [id]);
        if (citaDb.rows.length > 0 && citaDb.rows[0].google_event_id) {
            try { await calendar.events.delete({ calendarId: 'primary', eventId: citaDb.rows[0].google_event_id }); } catch (e) {} 
        }
        await pool.query('DELETE FROM citas WHERE id=$1', [id]);
        const nombreCita = citaDb.rows.length > 0 ? citaDb.rows[0].solicitante : `ID ${id}`;
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'CITAS', 'ELIMINAR', nombreCita, `Eliminó la cita`);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Error interno" }); }
};

module.exports = { obtenerCitas, crearCita, editarCita, eliminarCita };