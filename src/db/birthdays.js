import { getDb } from "./index.js";

export function getBirthdaySettings(guildId) {
  return getDb().prepare("SELECT * FROM birthday_settings WHERE guild_id = ?").get(guildId) ?? null;
}

export function upsertBirthdaySettings(guildId, patch) {
  const db = getDb();
  db.prepare("INSERT INTO birthday_settings (guild_id) VALUES (?) ON CONFLICT(guild_id) DO NOTHING").run(guildId);
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE birthday_settings SET ${set} WHERE guild_id = ?`).run(...Object.values(patch), guildId);
}

export function setBirthday(guildId, userId, day, month) {
  getDb().prepare(`
    INSERT INTO birthdays (guild_id, user_id, day, month)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET day = excluded.day, month = excluded.month
  `).run(guildId, userId, day, month);
}

export function removeBirthday(guildId, userId) {
  return getDb()
    .prepare("DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?")
    .run(guildId, userId).changes;
}

export function getBirthday(guildId, userId) {
  return getDb().prepare("SELECT * FROM birthdays WHERE guild_id = ? AND user_id = ?").get(guildId, userId) ?? null;
}

export function getBirthdaysToday() {
  const now = new Date();
  return getDb()
    .prepare(`
      SELECT b.*, bs.channel_id, bs.message
      FROM birthdays b
      JOIN birthday_settings bs ON b.guild_id = bs.guild_id
      WHERE b.day = ? AND b.month = ? AND bs.channel_id IS NOT NULL
    `)
    .all(now.getDate(), now.getMonth() + 1);
}
