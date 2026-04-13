const pool = require('../config/db');
const ExcelJS = require('exceljs');
const { registrarAuditoria, obtenerUsuarioReq } = require('../services/auditoria.service');

const generarReporteAsistencias = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        if (!fechaInicio || !fechaFin) return res.status(400).json({ error: 'Faltan fechas' });
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
            SELECT u.id AS empleado_id, u.nombres, u.apellido_paterno, u.apellido_materno, u.nombre AS departamento, a.fecha_hora
            FROM asistencias a INNER JOIN usuarios u ON a.empleado_id = u.id
            WHERE DATE(a.fecha_hora) >= $1 AND DATE(a.fecha_hora) <= $2 ORDER BY u.id, a.fecha_hora ASC
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
            const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });
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
            const fila = { id: emp.id, nombre: emp.nombre, departamento: emp.departamento };
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
        await registrarAuditoria(req, null, obtenerUsuarioReq(req), 'SISTEMA', 'REPORTE', 'ASISTENCIAS', `Descargó reporte de asistencias del ${fechaInicio} al ${fechaFin}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_Asistencias_${fechaInicio}_al_${fechaFin}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) { res.status(500).json({ error: 'Error al generar el Excel' }); }
};

module.exports = { generarReporteAsistencias };