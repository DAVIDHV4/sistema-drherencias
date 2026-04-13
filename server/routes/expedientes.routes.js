const express = require('express');
const router = express.Router();
const { upload } = require('../services/upload.service');
const {
    obtenerExpedientes,
    buscarGlobal,
    crearExpediente,
    editarExpediente,
    agregarArchivosRapidos,
    marcarFinal,
    desmarcarFinal,
    eliminarArchivo,
    descargarArchivo,
    buscarPorNumero
} = require('../controllers/expedientes.controller');

router.get('/', obtenerExpedientes);
router.get('/buscar-global', buscarGlobal);
router.get('/descargar', descargarArchivo);
router.get('/buscar-numero/:nro', buscarPorNumero);

router.post('/', upload.fields([{ name: 'editables' }, { name: 'finales' }]), crearExpediente);
router.put('/:id', upload.fields([{ name: 'editables' }, { name: 'finales' }]), editarExpediente);
router.post('/:id/archivos-rapidos', upload.fields([{ name: 'editables' }, { name: 'finales' }]), agregarArchivosRapidos);

router.put('/:id/marcar-final', marcarFinal);
router.put('/:id/desmarcar-final', desmarcarFinal);
router.put('/:id/eliminar-archivo', eliminarArchivo);

module.exports = router;