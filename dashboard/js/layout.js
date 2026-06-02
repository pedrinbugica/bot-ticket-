// Helper para renderizar o layout (sidebar + topbar) nas páginas
import { isLoggedIn, getCurrentUser, logout, getStoredGuild } from "./api.js";

export async function initLayout(activePage = "") {
  if (!isLoggedIn()) {
    window.location.href = "/index.html";
    return null;
  }

  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "/index.html";
    return null;
  }

  const guildId = getStoredGuild();
  if (!guildId && activePage !== "guilds") {
    window.location.href = "/guilds.html";
    return null;
  }

  // Preenche topbar
  const avatar = document.getElementById("userAvatar");
  const username = document.getElementById("username");
  if (avatar && user.avatar) {
    avatar.src = `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png?size=64`;
    avatar.alt = user.username;
  }
  if (username) username.textContent = user.username;

  // Marca link ativo na sidebar
  const links = document.querySelectorAll("nav.sidebar a[data-page]");
  links.forEach((a) => {
    if (a.dataset.page === activePage) a.classList.add("active");
  });

  // Botão de logout
  document.getElementById("logoutBtn")?.addEventListener("click", logout);

  return { user, guildId };
}

export function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="spinner"></div>';
}

export function showError(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
}

export function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function actionBadge(action) {
  const map = {
    warn:    ["Aviso",  "badge-yellow"],
    mute:    ["Mute",   "badge-orange"],
    kick:    ["Kick",   "badge-red"],
    ban:     ["Ban",    "badge-red"],
    tempban: ["Tempban","badge-orange"],
  };
  const [label, cls] = map[action] ?? [action, "badge-gray"];
  return `<span class="badge ${cls}">${label}</span>`;
}
