import { getDb } from "./index.js";

export function getJtcConfig(guildId) {
  return getDb().prepare("SELECT * FROM jtc_config WHERE guild_id = ?").get(guildId) ?? null;
}

export function upsertJtcConfig(guildId, triggerChannelId, categoryId, nameTemplate) {
  getDb().prepare(`
    INSERT INTO jtc_config (guild_id, trigger_channel_id, category_id, name_template)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id) DO UPDATE SET
      trigger_channel_id = excluded.trigger_channel_id,
      category_id = excluded.category_id,
      name_template = excluded.name_template
  `).run(guildId, triggerChannelId, categoryId ?? null, nameTemplate ?? "🎮 {username}");
}

export function removeJtcConfig(guildId) {
  getDb().prepare("DELETE FROM jtc_config WHERE guild_id = ?").run(guildId);
}

export function registerJtcChannel(guildId, channelId, ownerId) {
  getDb().prepare("INSERT OR REPLACE INTO jtc_channels (channel_id, guild_id, owner_id) VALUES (?, ?, ?)").run(channelId, guildId, ownerId);
}

export function removeJtcChannel(channelId) {
  getDb().prepare("DELETE FROM jtc_channels WHERE channel_id = ?").run(channelId);
}

export function isJtcChannel(channelId) {
  return !!getDb().prepare("SELECT 1 FROM jtc_channels WHERE channel_id = ?").get(channelId);
}
