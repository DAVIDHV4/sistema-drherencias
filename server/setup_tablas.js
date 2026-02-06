// Archivo: server/setup_tablas.js
const pool = require('./db');

const crearTablas = async () => {
  try {
    // 1. Tabla de USUARIOS (Para el Login)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL, -- Aquí guardaremos la clave encriptada
        nombre_completo VARCHAR(100),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla "usuarios" creada correctamente.');

    // 2. Tabla de EXPEDIENTES (Tu tabla principal)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expedientes (
        id SERIAL PRIMARY KEY,              -- Nº
        cliente VARCHAR(255) NOT NULL,
        dni_cliente VARCHAR(20),            -- DNI Cliente
        direccion_cliente TEXT,
        caso VARCHAR(255),
        categoria VARCHAR(100),             -- Civil, Penal, etc.
        numero_expediente VARCHAR(100),
        periodo VARCHAR(100),
        fecha_inicio DATE,
        fecha_finalizacion DATE,
        estado VARCHAR(50),                 -- Estado
        etapa_proceso VARCHAR(255),
        proceso_notarial TEXT,
        proceso_administrativo TEXT,
        procurador VARCHAR(255),
        dni_procurador VARCHAR(20),
        direccion_procurador TEXT,
        archivos TEXT,                      -- Ruta del PDF subido
        observaciones TEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla "expedientes" creada correctamente.');

    // 3. Crear un usuario ADMINISTRADOR por defecto (Usuario: admin, Clave: 123456)
    // NOTA: En producción esto debe ir encriptado, pero para empezar usaremos texto simple.
    await pool.query(`
      INSERT INTO usuarios (usuario, password, nombre_completo)
      VALUES ('admin', '123456', 'Administrador Principal')
      ON CONFLICT (usuario) DO NOTHING; -- Si ya existe, no hace nada
    `);
    console.log('👤 Usuario "admin" creado por defecto.');

    pool.end(); // Cerrar conexión
  } catch (error) {
    console.error('❌ Error al crear tablas:', error);
    pool.end();
  }
};

crearTablas();