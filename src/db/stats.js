import { getDb } from "./index.js";

export const STAT_TYPES = ["membros", "humanos", "bots", "canais", "cargos"];

export function listStatsChannels(guildId) {
  return getDb()
    .prepare("SELECT * FROM stats_channels WHERE guild_id = ? ORDER BY id ASC")
    .all(guildId);
}

export function getStatsChannel(guildId, statType) {
  return getDb()
    .prepare("SELECT * FROM stats_channels WHERE guild_id = ? AND stat_type = ?")
    .get(guildId, statType) ?? null;
}

export function upsertStatsChannel(guildId, statType, channelId, format) {
  getDb()
    .prepare(`
      INSERT INTO stats_channels (guild_id, stat_type, channel_id, format)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, stat_type) DO UPDATE SET
        channel_id = excluded.channel_id,
        format     = excluded.format
    `)
    .run(guildId, statType, channelId, format);
}

export function removeStatsChannel(guildId, statType) {
  return getDb()
    .prepare("DELETE FROM stats_channels WHERE guild_id = ? AND stat_type = ?")
    .run(guildId, statType).changes;
}
