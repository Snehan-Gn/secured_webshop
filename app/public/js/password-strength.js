const PASSWORD_RULES = [
  { id: "length", test: (p) => p.length >= 12, message: "12 caractères minimum" },
  { id: "lower", test: (p) => /[a-z]/.test(p), message: "Une minuscule" },
  { id: "upper", test: (p) => /[A-Z]/.test(p), message: "Une majuscule" },
  { id: "digit", test: (p) => /\d/.test(p), message: "Un chiffre" },
  { id: "special", test: (p) => /[^A-Za-z0-9]/.test(p), message: "Un caractère spécial" },
];

function evaluatePasswordStrength(password) {
  const value = password || "";
  const checks = PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    message: rule.message,
    valid: rule.test(value),
  }));
  const score = checks.filter((c) => c.valid).length;

  let label = "Très faible";
  let level = 0;
  if (score >= 5) {
    label = "Fort";
    level = 4;
  } else if (score >= 4) {
    label = "Moyen";
    level = 3;
  } else if (score >= 3) {
    label = "Faible";
    level = 2;
  } else if (score >= 2) {
    label = "Très faible";
    level = 1;
  }

  return { valid: score === PASSWORD_RULES.length, score, label, level, checks };
}

function initPasswordStrengthMeter(passwordInputId, containerId) {
  const input = document.getElementById(passwordInputId);
  const container = document.getElementById(containerId);
  if (!input || !container) return;

  const bar = container.querySelector(".password-strength-bar");
  const label = container.querySelector(".password-strength-label");
  const list = container.querySelector(".password-strength-rules");

  function render() {
    const result = evaluatePasswordStrength(input.value);
    bar.dataset.level = String(result.level);
    label.textContent = result.label;
    list.innerHTML = result.checks
      .map(
        (c) =>
          `<li class="${c.valid ? "valid" : "invalid"}">${c.valid ? "✓" : "○"} ${c.message}</li>`,
      )
      .join("");
    input.setCustomValidity(result.valid || !input.value ? "" : "Mot de passe trop faible");
  }

  input.addEventListener("input", render);
  render();
}

window.evaluatePasswordStrength = evaluatePasswordStrength;
window.initPasswordStrengthMeter = initPasswordStrengthMeter;
