const db = require("../config/db");
const bcrypt = require("bcrypt");
const PEPPER = process.env.PEPPER; 

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

      res.json({ message: "Connexion réussie", user: { id: user.id, name: user.username } });
    });
  },

  // ----------------------------------------------------------
  // POST /api/auth/register
  // ----------------------------------------------------------
  register: async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    try {
      const passwordWithPepper = password + PEPPER;
      
      const saltRounds = 10; 
      const hashedPassword = await bcrypt.hash(passwordWithPepper, saltRounds);

      const query = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;

      db.query(query, [name, email, hashedPassword, "user"], (err, result) => {
        if (err) return res.status(500).json({ error: "Erreur BDD" });
        res.status(201).json({ message: "Utilisateur créé avec succès" });
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur Interne" });
    }
  },
};