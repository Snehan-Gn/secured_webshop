const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const router     = express.Router();
const controller = require('../controllers/ProfileController');

// --- AJOUTE CETTE LIGNE ---
const { verifyToken } = require('../middleware/auth'); 

// Configuration de multer
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../public/uploads'),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- APPLIQUE verifyToken SUR CHAQUE ROUTE ---
// Sinon le controller ne sait pas quel ID chercher
router.get('/',       verifyToken, controller.get);
router.post('/',      verifyToken, controller.update);
router.post('/photo', verifyToken, upload.single('photo'), controller.uploadPhoto);

module.exports = router;