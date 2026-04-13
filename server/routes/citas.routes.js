const express = require('express');
const router = express.Router();
const { obtenerCitas, crearCita, editarCita, eliminarCita } = require('../controllers/citas.controller');

router.get('/', obtenerCitas);
router.post('/', crearCita);
router.put('/:id', editarCita);
router.delete('/:id', eliminarCita);

module.exports = router;