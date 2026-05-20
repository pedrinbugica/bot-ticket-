import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

function requireEnv(name) {
  const v = process.env[name];
  if (!v?.trim()) {
    console.error(`Variável de ambiente obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return v.trim();
}

export function parseHexColor(raw, fallback = 0x5865f2) {
  if (!raw) return fallback;
  const s = raw.trim().replace(/^#/, "");
  const n = Number.parseInt(s, 16);
  return Number.isFinite(n) && n >= 0 && n <= 0xffffff ? n : fallback;
}

function parseRoleIdsFromEnv(guildIdForWarn) {
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
    if (guildIdForWarn && id === guildIdForWarn) {
      console.warn(
        "[env] SUPPORT_ROLE_ID(S) usava o ID do servidor — ignorado. Use o ID do cargo de suporte."
      );
      continue;
    }
    out.push(id);
  }
  return out;
}

export function loadDefaultTicketTypesFromFile() {
  const path =
    process.env.TICKET_TYPES_PATH?.trim() ||
    join(root, "config", "ticket-types.json");
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("JSON deve ser um array");
    return parsed;
  } catch (err) {
    console.error(`Falha ao carregar tipos de ticket de ${path}:`, err.message);
    return [
      {
        value: "suporte",
        label: "Suporte geral",
        description: "Dúvidas e ajuda",
        emoji: "🛟",
      },
    ];
  }
}

const legacyGuildId = process.env.GUILD_ID?.trim() || null;

export const env = {
  token: requireEnv("DISCORD_TOKEN"),
  databasePath: process.env.DATABASE_PATH?.trim() || join(root, "data", "bot-ticket.db"),
  deployGlobal: process.env.DEPLOY_GLOBAL === "true",
  legacyGuildId,
  legacySeed: {
    ticketCategoryId: process.env.TICKET_CATEGORY_ID?.trim() || null,
    logChannelId: process.env.LOG_CHANNEL_ID?.trim() || null,
    supportRoleIds: parseRoleIdsFromEnv(legacyGuildId),
    panelColor: parseHexColor(process.env.TICKET_PANEL_COLOR),
    panelTitle: process.env.PANEL_TITLE?.trim() || "Central de atendimento",
    panelFooter: process.env.PANEL_FOOTER?.trim() || null,
    panelDescription: process.env.PANEL_DESCRIPTION?.trim() || null,
    panelRules: (
      process.env.TICKET_RULES?.trim() ||
      "• Um ticket por assunto.\n• Descreva o problema com calma.\n• Não marque a equipe repetidamente; aguarde o retorno."
    ).replace(/\\n/g, "\n"),
  },
  inactivityHours: Math.max(0, Number(process.env.INACTIVITY_HOURS) || 0),
  sendDmOnClose: process.env.SEND_DM_ON_CLOSE === "true",
  defaultTicketTypes: loadDefaultTicketTypesFromFile(),
};
