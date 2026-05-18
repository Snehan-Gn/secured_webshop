const MIN_LENGTH = 12;

const RULES = [
  {
    id: "length",
    test: (p) => p.length >= MIN_LENGTH,
    message: `Au moins ${MIN_LENGTH} caractères`,
  },
  {
    id: "lower",
    test: (p) => /[a-z]/.test(p),
    message: "Au moins une lettre minuscule",
  },
  {
    id: "upper",
    test: (p) => /[A-Z]/.test(p),
    message: "Au moins une lettre majuscule",
  },
  {
    id: "digit",
    test: (p) => /\d/.test(p),
    message: "Au moins un chiffre",
  },
  {
    id: "special",
    test: (p) => /[^A-Za-z0-9]/.test(p),
    message: "Au moins un caractère spécial (!@#$%…)",
  },
];

function evaluatePassword(password) {
  const value = password || "";
  const checks = RULES.map((rule) => ({
    id: rule.id,
    message: rule.message,
    valid: rule.test(value),
  }));
  const score = checks.filter((c) => c.valid).length;
  const valid = score === RULES.length;

  let label = "Très faible";
  if (score >= 5) label = "Fort";
  else if (score >= 4) label = "Moyen";
  else if (score >= 3) label = "Faible";
  else if (score >= 2) label = "Très faible";

  return { valid, score, maxScore: RULES.length, label, checks };
}

function validatePassword(password) {
  const result = evaluatePassword(password);
  if (result.valid) {
    return { ok: true };
  }
  const failed = result.checks.filter((c) => !c.valid).map((c) => c.message);
  return {
    ok: false,
    error: `Mot de passe insuffisant : ${failed.join(", ")}.`,
    details: result.checks,
  };
}

module.exports = {
  MIN_LENGTH,
  RULES,
  evaluatePassword,
  validatePassword,
};
