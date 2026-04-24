const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const PEPPER = process.env.PEPPER; 
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key'; 

module.exports = {
  // ----------------------------------------------------------
  // POST /api/auth/login
  // ----------------------------------------------------------
  login: (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const query = `SELECT * FROM users WHERE email = ?`;

    db.query(query, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      const user = results[0];

      const passwordWithPepper = password + PEPPER;
      const isMatch = await bcrypt.compare(passwordWithPepper, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
      );

      res.json({ 
        message: "Connexion réussie", 
        token: token, 
        user: { 
          id: user.id, 
          name: user.username, 
          role: user.role 
        } 
      });
    });
  },

  // ----------------------------------------------------------
  // POST /api/auth/register
  // ----------------------------------------------------------
  register: async (req, res) => {
    const { name, email, password, role, address } = req.body; 

    if (!name || !email || !password || !address) {
      return res.status(400).json({ error: "Tous les champs sont requis, y compris l'adresse" });
    }

    try {
      const passwordWithPepper = password + PEPPER;
      const saltRounds = 10; 
      const hashedPassword = await bcrypt.hash(passwordWithPepper, saltRounds);

      const userRole = role || "user";

      const query = `INSERT INTO users (username, email, password, role, address) VALUES (?, ?, ?, ?, ?)`;

      db.query(query, [name, email, hashedPassword, userRole, address], (err, result) => {
        if (err) {
          console.error("Erreur SQL:", err);
          return res.status(500).json({ error: "Erreur lors de la création en base de données" });
        }
        
        res.status(201).json({ message: "Utilisateur créé avec succès" });
      });
    } catch (err) {
      console.error("Erreur Interne:", err);
      res.status(500).json({ error: "Erreur lors du traitement du mot de passe" });
    }
  },
};