const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const db = require("../config/db"); 

router.get('/', verifyToken, isAdmin, (req, res) => {
    const query = "SELECT id, username, email, role, address FROM users";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;