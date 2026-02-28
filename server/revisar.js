require('dotenv').config();
const pool = require('./db');

async function revisar() {
    try {
        console.log("🔍 Buscando cómo se guardaban los archivos antiguos...");
        const res = await pool.query("SELECT nro_expediente, archivos_editables, archivos_finales FROM expedientes WHERE (archivos_editables IS NOT NULL AND archivos_editables != '[]' AND archivos_editables != '') OR (archivos_finales IS NOT NULL AND archivos_finales != '[]' AND archivos_finales != '') LIMIT 5");
        
        if (res.rows.length === 0) {
            console.log("⚠️ Tu base de datos dice que NO HAY NINGÚN ARCHIVO registrado en ningún expediente antiguo.");
        } else {
            console.log(JSON.stringify(res.rows, null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

revisar();