import { getDb } from "./index.js";

export function getCountingChannel(guildId) {
  return getDb().prepare("SELECT * FROM counting_channels WHERE guild_id = ?").get(guildId) ?? null;
}

export function setCountingChannel(guildId, channelId) {
  getDb().prepare(`
    INSERT INTO counting_channels (guild_id, channel_id, current_number, last_user_id, high_score)
    VALUES (?, ?, 0, NULL, 0)
    ON CONFLICT(guild_id) DO UPDATE SET channel_id = excluded.channel_id
  `).run(guildId, channelId);
}

export function removeCountingChannel(guildId) {
  getDb().prepare("DELETE FROM counting_channels WHERE guild_id = ?").run(guildId);
}

export function advanceCounting(guildId, number, userId) {
  const db = getDb();
  const row = db.prepare("SELECT high_score FROM counting_channels WHERE guild_id = ?").get(guildId);
  const newHigh = Math.max(row?.high_score ?? 0, number);
  db.prepare("UPDATE counting_channels SET current_number = ?, last_user_id = ?, high_score = ? WHERE guild_id = ?")
    .run(number, userId, newHigh, guildId);
}

export function resetCounting(guildId) {
  getDb().prepare("UPDATE counting_channels SET current_number = 0, last_user_id = NULL WHERE guild_id = ?").run(guildId);
}
