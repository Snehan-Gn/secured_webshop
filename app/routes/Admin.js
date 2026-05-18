const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const db = require("../config/db");
const { adminUnlockUser } = require('../utils/loginSecurity');

router.get('/', verifyToken, isAdmin, (req, res) => {
    const query = `
        SELECT id, username, email, role, address, failed_login_count, locked_until,
               (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked
        FROM users`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/users/:id/unlock', verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (!userId) {
            return res.status(400).json({ error: "Identifiant invalide" });
        }
        const ok = await adminUnlockUser(userId);
        if (!ok) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }
        res.json({ message: "Compte débloqué par l'administrateur" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;