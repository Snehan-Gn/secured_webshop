const crypto = require("crypto");
const db = require("../config/db");

const MAX_PER_IP = parseInt(process.env.LOGIN_MAX_PER_IP || "5", 10);
const RATE_WINDOW_MIN = parseInt(process.env.LOGIN_RATE_WINDOW_MINUTES || "1", 10);
const LOCK_AFTER = parseInt(process.env.ACCOUNT_LOCK_AFTER || "5", 10);
const LOCK_MINUTES = parseInt(process.env.ACCOUNT_LOCK_MINUTES || "15", 10);

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

async function countRecentAttemptsByIp(ip) {
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE ip_address = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [ip, RATE_WINDOW_MIN],
  );
  return rows[0].cnt;
}

async function isIpRateLimited(ip) {
  const count = await countRecentAttemptsByIp(ip);
  return count >= MAX_PER_IP;
}

async function recordLoginAttempt({ userId, email, ip, success }) {
  await query(
    `INSERT INTO login_attempts (user_id, email, ip_address, success) VALUES (?, ?, ?, ?)`,
    [userId || null, email, ip, success ? 1 : 0],
  );
}

async function refreshLockState(user) {
  if (!user.locked_until) {
    return { locked: false, user };
  }
  const rows = await query(
    `SELECT id, failed_login_count, locked_until,
            (locked_until > NOW()) AS is_locked
     FROM users WHERE id = ?`,
    [user.id],
  );
  if (rows.length === 0) {
    return { locked: false, user };
  }
  const row = rows[0];
  if (!row.is_locked) {
    await clearAccountLock(user.id);
    return { locked: false, user: { ...user, failed_login_count: 0, locked_until: null } };
  }
  return { locked: true, user: { ...user, ...row } };
}

async function clearAccountLock(userId) {
  await query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL,
     unlock_token_hash = NULL, unlock_token_expires_at = NULL WHERE id = ?`,
    [userId],
  );
}

async function lockAccount(userId) {
  const unlockToken = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(unlockToken).digest("hex");
  await query(
    `UPDATE users SET failed_login_count = ?, locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE),
     unlock_token_hash = ?, unlock_token_expires_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
     WHERE id = ?`,
    [LOCK_AFTER, LOCK_MINUTES, hash, userId],
  );
  const rows = await query(`SELECT locked_until FROM users WHERE id = ?`, [userId]);
  return {
    unlockToken,
    lockedUntil: rows[0]?.locked_until,
  };
}

async function registerFailedLogin(user) {
  const newCount = (user.failed_login_count || 0) + 1;
  if (newCount >= LOCK_AFTER) {
    const lock = await lockAccount(user.id);
    return { locked: true, ...lock };
  }
  await query(`UPDATE users SET failed_login_count = ? WHERE id = ?`, [newCount, user.id]);
  return { locked: false, attemptsLeft: LOCK_AFTER - newCount };
}

async function unlockWithToken(email, unlockToken) {
  const hash = crypto.createHash("sha256").update(unlockToken).digest("hex");
  const rows = await query(
    `SELECT id FROM users WHERE email = ? AND unlock_token_hash = ?
     AND unlock_token_expires_at > NOW()`,
    [email, hash],
  );
  if (rows.length === 0) {
    return false;
  }
  await clearAccountLock(rows[0].id);
  return true;
}

async function adminUnlockUser(userId) {
  const rows = await query(`SELECT id FROM users WHERE id = ?`, [userId]);
  if (rows.length === 0) {
    return false;
  }
  await clearAccountLock(userId);
  return true;
}

module.exports = {
  MAX_PER_IP,
  RATE_WINDOW_MIN,
  LOCK_AFTER,
  LOCK_MINUTES,
  getClientIp,
  isIpRateLimited,
  recordLoginAttempt,
  refreshLockState,
  clearAccountLock,
  registerFailedLogin,
  unlockWithToken,
  adminUnlockUser,
};
