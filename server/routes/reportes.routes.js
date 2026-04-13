const express = require('express');
const router = express.Router();
const { generarReporteAsistencias } = require('../controllers/reportes.controller');

router.get('/asistencias', generarReporteAsistencias);

module.exports = router;