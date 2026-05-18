const db = require("../config/db");
const bcrypt = require("bcrypt");
const { validatePassword } = require("../utils/passwordPolicy");
const {
  signAccessToken,
  signRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  verifyStoredRefreshToken,
} = require("../utils/tokens");

const PEPPER = process.env.PEPPER;

function issueTokens(user, res) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  saveRefreshToken(user.id, refreshToken, (err) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la création de session" });
    }

    res.json({
      message: "Connexion réussie",
      accessToken,
      refreshToken,
      token: accessToken,
      user: {
        id: user.id,
        name: user.username,
        role: user.role,
      },
    });
  });
}

module.exports = {
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

      issueTokens(user, res);
    });
  },

  refresh: (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token requis" });
    }

    verifyStoredRefreshToken(refreshToken, (err, row) => {
      if (err) {
        return res.status(403).json({ error: err.message });
      }

      const user = {
        id: row.user_id,
        username: row.username,
        role: row.role,
      };

      const accessToken = signAccessToken(user);
      res.json({
        accessToken,
        token: accessToken,
        user: {
          id: user.id,
          name: user.username,
          role: user.role,
        },
      });
    });
  },

  logout: (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token requis" });
    }

    revokeRefreshToken(refreshToken, (err) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la déconnexion" });
      }
      res.json({ message: "Déconnexion réussie" });
    });
  },

  register: async (req, res) => {
    const { name, email, password, role, address } = req.body;

    if (!name || !email || !password || !address) {
      return res
        .status(400)
        .json({ error: "Tous les champs sont requis, y compris l'adresse" });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      return res.status(400).json({
        error: passwordCheck.error,
        details: passwordCheck.details,
      });
    }

    try {
      const passwordWithPepper = password + PEPPER;
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(passwordWithPepper, saltRounds);
      const userRole = role || "user";

      const query = `INSERT INTO users (username, email, password, role, address) VALUES (?, ?, ?, ?, ?)`;

      db.query(
        query,
        [name, email, hashedPassword, userRole, address],
        (err) => {
          if (err) {
            console.error("Erreur SQL:", err);
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(409).json({ error: "Cet email est déjà utilisé" });
            }
            return res
              .status(500)
              .json({ error: "Erreur lors de la création en base de données" });
          }

          res.status(201).json({ message: "Utilisateur créé avec succès" });
        },
      );
    } catch (err) {
      console.error("Erreur Interne:", err);
      res.status(500).json({ error: "Erreur lors du traitement du mot de passe" });
    }
  },
};
