const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function setTokens(data) {
  const accessToken = data.accessToken || data.token;
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem("token", accessToken);
  }
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  }
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem("token");
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem("token");
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Aucun refresh token");
  }

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Impossible de renouveler la session");
  }

  const data = await response.json();
  setTokens(data);
  return data.accessToken;
}

async function fetchWithAuth(url, options = {}) {
  let token = getAccessToken();
  const headers = { ...(options.headers || {}), Authorization: "Bearer " + token };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && getRefreshToken()) {
    try {
      token = await refreshAccessToken();
      headers.Authorization = "Bearer " + token;
      response = await fetch(url, { ...options, headers });
    } catch {
      clearTokens();
      window.location.href = "/login";
      throw new Error("Session expirée");
    }
  }

  return response;
}

async function logout() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  }
  clearTokens();
}

window.setTokens = setTokens;
window.getAccessToken = getAccessToken;
window.clearTokens = clearTokens;
window.fetchWithAuth = fetchWithAuth;
window.logout = logout;
