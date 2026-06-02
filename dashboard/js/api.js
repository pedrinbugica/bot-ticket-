// URL base da API — aponta para o bot no Discloud
// Para testar local: abra o console do navegador e escreva: window.API_URL = "http://localhost:3000"
const API_URL = window.API_URL ?? "https://discord-admin-bot.discloud.app";

// ── Token JWT ──────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("dashboard_token");
}

function setToken(token) {
  localStorage.setItem("dashboard_token", token);
}

function clearToken() {
  localStorage.removeItem("dashboard_token");
  localStorage.removeItem("dashboard_guild");
}

export function getStoredGuild() {
  return localStorage.getItem("dashboard_guild");
}

export function setStoredGuild(guildId) {
  localStorage.setItem("dashboard_guild", guildId);
}

// ── Usuário logado ─────────────────────────────────────────────────────────

export function isLoggedIn() {
  return !!getToken();
}

export async function getCurrentUser() {
  try {
    const data = await apiFetch("/auth/me");
    return data;
  } catch {
    return null;
  }
}

export function logout() {
  clearToken();
  window.location.href = "/index.html";
}

// ── Fetch helper ───────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/index.html";
    throw new Error("Sessão expirada.");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export function loginWithDiscord(redirect = "/guilds.html") {
  window.location.href = `${API_URL}/auth/login?redirect=${encodeURIComponent(redirect)}`;
}

export function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const redirect = params.get("redirect") ?? "/guilds.html";

  if (token) {
    setToken(token);
    window.location.href = redirect;
  } else {
    window.location.href = "/index.html";
  }
}

// ── Guilds ─────────────────────────────────────────────────────────────────

export async function getGuilds() {
  return apiFetch("/api/guilds");
}

// ── Overview ───────────────────────────────────────────────────────────────

export async function getOverview(guildId) {
  return apiFetch(`/api/guilds/${guildId}/overview`);
}

// ── Tickets ────────────────────────────────────────────────────────────────

export async function getTickets(guildId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/api/guilds/${guildId}/tickets${qs ? `?${qs}` : ""}`);
}

// ── Moderação ──────────────────────────────────────────────────────────────

export async function getModeration(guildId, limit = 25) {
  return apiFetch(`/api/guilds/${guildId}/moderation?limit=${limit}`);
}

export async function getUserInfractions(guildId, userId) {
  return apiFetch(`/api/guilds/${guildId}/moderation/user/${userId}`);
}

export async function deleteCase(guildId, caseNumber) {
  return apiFetch(`/api/guilds/${guildId}/moderation/${caseNumber}`, { method: "DELETE" });
}

// ── Leveling ───────────────────────────────────────────────────────────────

export async function getLeaderboard(guildId, limit = 20, offset = 0) {
  return apiFetch(`/api/guilds/${guildId}/leveling/leaderboard?limit=${limit}&offset=${offset}`);
}

export async function getLevelingSettings(guildId) {
  return apiFetch(`/api/guilds/${guildId}/leveling/settings`);
}

export async function patchLevelingSettings(guildId, patch) {
  return apiFetch(`/api/guilds/${guildId}/leveling/settings`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function addLevelRole(guildId, level, roleId) {
  return apiFetch(`/api/guilds/${guildId}/leveling/roles`, {
    method: "POST",
    body: JSON.stringify({ level, roleId }),
  });
}

export async function deleteLevelRole(guildId, level) {
  return apiFetch(`/api/guilds/${guildId}/leveling/roles/${level}`, { method: "DELETE" });
}

export async function resetUserXp(guildId, userId) {
  return apiFetch(`/api/guilds/${guildId}/leveling/user/${userId}/xp`, { method: "DELETE" });
}

// ── Módulos ────────────────────────────────────────────────────────────────

export async function getModules(guildId) {
  return apiFetch(`/api/guilds/${guildId}/modules`);
}

export async function patchModule(guildId, module, patch) {
  return apiFetch(`/api/guilds/${guildId}/modules/${module}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function addAutomodWord(guildId, word, action = "delete") {
  return apiFetch(`/api/guilds/${guildId}/modules/automod/words`, {
    method: "POST",
    body: JSON.stringify({ word, action }),
  });
}

export async function deleteAutomodWord(guildId, word) {
  return apiFetch(`/api/guilds/${guildId}/modules/automod/words/${encodeURIComponent(word)}`, {
    method: "DELETE",
  });
}

// ── Conteúdo ───────────────────────────────────────────────────────────────

export async function getTags(guildId) {
  return apiFetch(`/api/guilds/${guildId}/content/tags`);
}

export async function createTag(guildId, trigger, response) {
  return apiFetch(`/api/guilds/${guildId}/content/tags`, {
    method: "POST",
    body: JSON.stringify({ trigger, response }),
  });
}

export async function deleteTag(guildId, trigger) {
  return apiFetch(`/api/guilds/${guildId}/content/tags/${encodeURIComponent(trigger)}`, {
    method: "DELETE",
  });
}

export async function getGiveaways(guildId) {
  return apiFetch(`/api/guilds/${guildId}/content/giveaways`);
}

export async function getPolls(guildId) {
  return apiFetch(`/api/guilds/${guildId}/content/polls`);
}

export async function getBirthdays(guildId) {
  return apiFetch(`/api/guilds/${guildId}/content/birthdays`);
}

export async function getScheduled(guildId) {
  return apiFetch(`/api/guilds/${guildId}/content/scheduled`);
}

export async function createScheduled(guildId, data) {
  return apiFetch(`/api/guilds/${guildId}/content/scheduled`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteScheduled(guildId, id) {
  return apiFetch(`/api/guilds/${guildId}/content/scheduled/${id}`, { method: "DELETE" });
}
