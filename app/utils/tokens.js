const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || JWT_SECRET + "_refresh";
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      type: "access",
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      id: user.id,
      type: "refresh",
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES },
  );
}

function saveRefreshToken(userId, refreshToken, cb) {
  const tokenHash = hashToken(refreshToken);
  const query = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))
  `;
  db.query(query, [userId, tokenHash], cb);
}

function revokeRefreshToken(refreshToken, cb) {
  const tokenHash = hashToken(refreshToken);
  db.query(
    "DELETE FROM refresh_tokens WHERE token_hash = ?",
    [tokenHash],
    cb,
  );
}

function revokeAllUserRefreshTokens(userId, cb) {
  db.query("DELETE FROM refresh_tokens WHERE user_id = ?", [userId], cb);
}

function verifyStoredRefreshToken(refreshToken, cb) {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch {
    return cb(new Error("Refresh token invalide ou expiré"));
  }

  if (decoded.type !== "refresh") {
    return cb(new Error("Type de token incorrect"));
  }

  const tokenHash = hashToken(refreshToken);
  const query = `
    SELECT rt.id, u.id AS user_id, u.username, u.role
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.user_id
    WHERE rt.token_hash = ? AND rt.expires_at > NOW() AND u.id = ?
  `;

  db.query(query, [tokenHash, decoded.id], (err, results) => {
    if (err) return cb(err);
    if (results.length === 0) {
      return cb(new Error("Refresh token révoqué ou inconnu"));
    }
    cb(null, results[0]);
  });
}

module.exports = {
  ACCESS_EXPIRES,
  REFRESH_EXPIRES,
  signAccessToken,
  signRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  verifyStoredRefreshToken,
};
