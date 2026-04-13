const express = require('express');
const router = express.Router();
const { obtenerAuditoria, crearEventoAuditoria } = require('../controllers/auditoria.controller');

router.get('/', obtenerAuditoria);
router.post('/', crearEventoAuditoria);

module.exports = router;