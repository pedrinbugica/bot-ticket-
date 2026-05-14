import "dotenv/config";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Variável de ambiente obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return v.trim();
}

function parseHexColor(raw) {
  if (!raw) return 0x5865f2;
  const s = raw.trim().replace(/^#/, "");
  const n = Number.parseInt(s, 16);
  return Number.isFinite(n) && n >= 0 && n <= 0xffffff ? n : 0x5865f2;
}

function parseRoleIds(guildId) {
  const list = (process.env.SUPPORT_ROLE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const legacyRaw = process.env.SUPPORT_ROLE_ID?.trim();
  if (legacyRaw) {
    for (const id of legacyRaw.split(",").map((x) => x.trim()).filter(Boolean)) {
      if (!list.includes(id)) list.push(id);
    }
  }

  const out = [];
  const seen = new Set();
  for (const id of list) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (id === guildId) {
      console.warn(
        "[config] SUPPORT_ROLE_ID(S) usava o ID do servidor (cargo @everyone). " +
          "Todos os membros teriam acesso a assumir/fechar tickets — ignorado. " +
          "Use o ID do cargo de suporte/moderador (clique com o direito no cargo → Copiar ID)."
      );
      continue;
    }
    out.push(id);
  }
  return out;
}

const guildId = requireEnv("GUILD_ID");

export const config = {
  token: requireEnv("DISCORD_TOKEN"),
  guildId,
  ticketCategoryId: requireEnv("TICKET_CATEGORY_ID"),
  supportRoleIds: parseRoleIds(guildId),
  logChannelId: process.env.LOG_CHANNEL_ID?.trim() || null,
  ticketPanelColor: parseHexColor(process.env.TICKET_PANEL_COLOR),
  ticketRules: (
    process.env.TICKET_RULES?.trim() ||
    "• Um ticket por assunto.\n• Descreva o problema com calma.\n• Não marque a equipe repetidamente; aguarde o retorno."
  ).replace(/\\n/g, "\n"),
};
