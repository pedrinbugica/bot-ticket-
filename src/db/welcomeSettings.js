import { getDb } from "./index.js";

const cache = new Map();
const CACHE_TTL = 60_000;

export function getWelcomeSettings(guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.row;

  const row = getDb()
    .prepare("SELECT * FROM welcome_settings WHERE guild_id = ?")
    .get(guildId) ?? null;

  cache.set(guildId, { row, ts: Date.now() });
  return row;
}

export function upsertWelcomeSettings(guildId, patch) {
  const db = getDb();
  const existing = db.prepare("SELECT guild_id FROM welcome_settings WHERE guild_id = ?").get(guildId);

  if (!existing) {
    db.prepare(`
      INSERT INTO welcome_settings
        (guild_id, welcome_channel_id, welcome_message, goodbye_channel_id, goodbye_message, welcome_dm, auto_role_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildId,
      patch.welcome_channel_id ?? null,
      patch.welcome_message ?? null,
      patch.goodbye_channel_id ?? null,
      patch.goodbye_message ?? null,
      patch.welcome_dm ?? null,
      patch.auto_role_ids ?? "[]"
    );
  } else {
    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(patch)) {
      updates.push(`${key} = ?`);
      values.push(val);
    }
    if (updates.length) {
      db.prepare(`UPDATE welcome_settings SET ${updates.join(", ")} WHERE guild_id = ?`)
        .run(...values, guildId);
    }
  }

  cache.delete(guildId);
}

export function invalidateWelcomeCache(guildId) {
  cache.delete(guildId);
}
