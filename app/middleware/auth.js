const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

module.exports = {
  verifyToken: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Accès refusé, token manquant" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Token invalide ou expiré" });
      }

      if (decoded.type && decoded.type !== "access") {
        return res.status(403).json({ error: "Type de token non autorisé" });
      }

      req.user = decoded;
      next();
    });
  },

  isAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next(); 
    } else {
      res.status(403).json({ error: "Accès interdit : réservé aux administrateurs" });
    }
  }
};