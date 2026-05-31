import { getDb } from "./index.js";

export function getStarboardConfig(guildId) {
  return getDb()
    .prepare("SELECT * FROM starboard_config WHERE guild_id = ?")
    .get(guildId) ?? null;
}

export function upsertStarboardConfig(guildId, { channelId, emoji, minReactions }) {
  getDb()
    .prepare(`
      INSERT INTO starboard_config (guild_id, channel_id, emoji, min_reactions)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id    = excluded.channel_id,
        emoji         = excluded.emoji,
        min_reactions = excluded.min_reactions
    `)
    .run(guildId, channelId, emoji, minReactions);
}

export function disableStarboard(guildId) {
  getDb()
    .prepare("UPDATE starboard_config SET enabled = 0 WHERE guild_id = ?")
    .run(guildId);
}

export function getStarboardEntry(guildId, sourceMessageId) {
  return getDb()
    .prepare("SELECT * FROM starboard_entries WHERE guild_id = ? AND source_message_id = ?")
    .get(guildId, sourceMessageId) ?? null;
}

export function upsertStarboardEntry(guildId, sourceMessageId, sourceChannelId, starboardMessageId) {
  getDb()
    .prepare(`
      INSERT INTO starboard_entries (guild_id, source_message_id, source_channel_id, starboard_message_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, source_message_id) DO UPDATE SET
        starboard_message_id = excluded.starboard_message_id
    `)
    .run(guildId, sourceMessageId, sourceChannelId, starboardMessageId);
}
