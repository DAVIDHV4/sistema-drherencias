const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function crearAdmin() {
    try {
        // Encriptamos la contraseña "123456"
        const hash = await bcrypt.hash('123456', 10);
        
        // Insertamos el usuario en tu base de datos local
        await pool.query(
            "INSERT INTO usuarios (usuario, password, nombre) VALUES ($1, $2, $3)", 
            ['admin', hash, 'Administrador Local']
        );
        
        console.log('✅ Usuario creado exitosamente.');
        console.log('👉 Usuario: admin');
        console.log('👉 Contraseña: 123456');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear usuario:', error);
        process.exit(1);
    }
}

crearAdmin();