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
const {
  getClientIp,
  isIpRateLimited,
  recordLoginAttempt,
  refreshLockState,
  clearAccountLock,
  registerFailedLogin,
  unlockWithToken,
  MAX_PER_IP,
  RATE_WINDOW_MIN,
  LOCK_AFTER,
} = require("../utils/loginSecurity");

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

async function failLogin(res, { user, email, ip, status = 401, message }) {
  try {
    await recordLoginAttempt({
      userId: user?.id,
      email,
      ip,
      success: false,
    });
    if (user) {
      const result = await registerFailedLogin(user);
      if (result.locked) {
        return res.status(423).json({
          error: "Compte verrouillé après trop de tentatives échouées.",
          lockedUntil: result.lockedUntil,
          unlockToken: result.unlockToken,
        });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur" });
  }

  const payload = { error: message || "Email ou mot de passe incorrect" };
  if (user) {
    const left = LOCK_AFTER - (user.failed_login_count || 0) - 1;
    if (left > 0 && left < LOCK_AFTER) {
      payload.attemptsRemaining = left;
    }
  }
  return res.status(status).json(payload);
}

module.exports = {
  login: async (req, res) => {
    const { email, password } = req.body;
    const ip = getClientIp(req);

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    try {
      if (await isIpRateLimited(ip)) {
        return res.status(429).json({
          error: `Trop de tentatives depuis cette adresse IP. Limite : ${MAX_PER_IP} par ${RATE_WINDOW_MIN} minute(s).`,
        });
      }

      const results = await new Promise((resolve, reject) => {
        db.query(`SELECT * FROM users WHERE email = ?`, [email], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const user = results[0];
      if (user) {
        const lockState = await refreshLockState(user);
        if (lockState.locked) {
          return res.status(423).json({
            error: "Compte temporairement verrouillé. Réessayez plus tard ou débloquez le compte.",
            lockedUntil: lockState.user.locked_until,
          });
        }
      }

      if (!user) {
        return failLogin(res, { email, ip });
      }

      const passwordWithPepper = password + PEPPER;
      const isMatch = await bcrypt.compare(passwordWithPepper, user.password);

      if (!isMatch) {
        return failLogin(res, { user, email, ip });
      }

      await recordLoginAttempt({ userId: user.id, email, ip, success: true });
      await clearAccountLock(user.id);
      issueTokens(user, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  unlock: async (req, res) => {
    const { email, unlockToken } = req.body;

    if (!email || !unlockToken) {
      return res.status(400).json({ error: "Email et jeton de déblocage requis" });
    }

    try {
      const ok = await unlockWithToken(email, unlockToken);
      if (!ok) {
        return res.status(400).json({ error: "Jeton invalide ou expiré" });
      }
      res.json({ message: "Compte débloqué. Vous pouvez vous reconnecter." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur serveur" });
    }
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
