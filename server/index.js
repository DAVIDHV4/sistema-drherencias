require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const expedientesRoutes = require('./routes/expedientes.routes');
const citasRoutes = require('./routes/citas.routes');
const reportesRoutes = require('./routes/reportes.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, '../dist');
app.use(express.static(frontendPath));

app.use('/api', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/expedientes', expedientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/auditoria', auditoriaRoutes);

app.use((req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });

app.listen(PORT, () => { console.log(`Servidor modularizado listo en puerto ${PORT}`); });