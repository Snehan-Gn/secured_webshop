const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

router.get('/profile', verifyToken, (req, res) => {
    res.json({ message: `Données de l'utilisateur ${req.user.username}` });
});

module.exports = router;