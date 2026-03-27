const db = require("../config/db");

module.exports = {
  // ----------------------------------------------------------
  // POST /api/auth/login
  // ----------------------------------------------------------
  login: (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

    db.query(query, [email, password], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        return res
          .status(401)
          .json({ error: "Email ou mot de passe incorrect" });
      }

      res.json({ message: "Connexion réussie", user: results[0] });
    });
  },

  // ----------------------------------------------------------
  // POST /api/auth/register
  // ----------------------------------------------------------
  register: (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Tous les champs sont requis" });
    }

    const query = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;

    db.query(query, [name, email, password, "user"], (err, result) => {
      if (err) {
        console.error("Erreur SQL :", err);
        return res
          .status(500)
          .json({ error: "Erreur BDD", details: err.message });
      }

      res.redirect("/login");
    });
  },
};
