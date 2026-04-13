const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        let nombreCorregido = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/\s+/g, '_');
        cb(null, Date.now() + '_' + nombreCorregido);
    }
});

const upload = multer({ storage: storage });

module.exports = { upload };