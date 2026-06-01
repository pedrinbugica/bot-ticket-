import { listStatsChannels } from "../db/stats.js";
import { getDb } from "../db/index.js";

const DEFAULT_FORMATS = {
  membros:     "👥 Membros: {value}",
  humanos:     "🧑 Humanos: {value}",
  bots:        "🤖 Bots: {value}",
  canais:      "📢 Canais: {value}",
  cargos:      "🏷️ Cargos: {value}",
  boosts:      "🚀 Boosts: {value}",
  "nivel-boost": "💎 Boost Nível {value}",
  emojis:      "😄 Emojis: {value}",
  tickets:     "🎫 Tickets abertos: {value}",
};

export function getDefaultFormat(statType) {
  return DEFAULT_FORMATS[statType] ?? "{value}";
}

function countOpenTickets(guildId) {
  try {
    return getDb()
      .prepare("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ?")
      .get(guildId).c;
  } catch {
    return 0;
  }
}

function computeStat(guild, statType) {
  switch (statType) {
    case "membros":      return guild.memberCount;
    case "humanos":      return guild.members.cache.filter((m) => !m.user.bot).size;
    case "bots":         return guild.members.cache.filter((m) => m.user.bot).size;
    case "canais":       return guild.channels.cache.size;
    case "cargos":       return guild.roles.cache.size;
    case "boosts":       return guild.premiumSubscriptionCount ?? 0;
    case "nivel-boost":  return guild.premiumTier ?? 0;
    case "emojis":       return guild.emojis.cache.size;
    case "tickets":      return countOpenTickets(guild.id);
    default: return 0;
  }
}

function formatName(template, value) {
  return template.replace("{value}", String(value)).slice(0, 100);
}

export async function updateStatsForGuild(guild) {
  const rows = listStatsChannels(guild.id);
  if (!rows.length) return;

  for (const row of rows) {
    const channel = guild.channels.cache.get(row.channel_id)
      ?? await guild.channels.fetch(row.channel_id).catch(() => null);
    if (!channel) continue;

    const value = computeStat(guild, row.stat_type);
    const newName = formatName(row.format, value);

    if (channel.name !== newName) {
      await channel.setName(newName).catch(() => null);
    }
  }
}

export async function updateAllStatsChannels(client) {
  for (const guild of client.guilds.cache.values()) {
    await updateStatsForGuild(guild).catch(() => null);
  }
}
