import { getDb } from "./index.js";

const settingsCache = new Map(); // guildId → { settings, ts }
const TTL = 60_000;

export function getLevelSettings(guildId) {
  const now = Date.now();
  const cached = settingsCache.get(guildId);
  if (cached && now - cached.ts < TTL) return cached.settings;

  const row = getDb().prepare("SELECT * FROM level_settings WHERE guild_id = ?").get(guildId);
  const settings = row ?? {
    guild_id: guildId,
    enabled: 0,
    levelup_channel_id: null,
    xp_per_message: 15,
    xp_cooldown_secs: 60,
  };
  settingsCache.set(guildId, { settings, ts: now });
  return settings;
}

export function upsertLevelSettings(guildId, patch) {
  const db = getDb();
  db.prepare("INSERT INTO level_settings (guild_id) VALUES (?) ON CONFLICT(guild_id) DO NOTHING").run(guildId);
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE level_settings SET ${set} WHERE guild_id = ?`).run(...Object.values(patch), guildId);
  settingsCache.delete(guildId);
}

export function getUserLevel(guildId, userId) {
  return getDb()
    .prepare("SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?")
    .get(guildId, userId) ?? null;
}

export function addXp(guildId, userId, xp) {
  const db = getDb();
  db.prepare(`
    INSERT INTO user_levels (guild_id, user_id, xp, level, last_xp_at)
    VALUES (?, ?, ?, 0, datetime('now'))
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
      xp = xp + excluded.xp,
      last_xp_at = datetime('now')
  `).run(guildId, userId, xp);
  return db.prepare("SELECT xp FROM user_levels WHERE guild_id = ? AND user_id = ?").get(guildId, userId).xp;
}

export function setLevel(guildId, userId, level) {
  getDb()
    .prepare("UPDATE user_levels SET level = ? WHERE guild_id = ? AND user_id = ?")
    .run(level, guildId, userId);
}

export function resetUserXp(guildId, userId) {
  getDb()
    .prepare("UPDATE user_levels SET xp = 0, level = 0, last_xp_at = NULL WHERE guild_id = ? AND user_id = ?")
    .run(guildId, userId);
}

export function getLeaderboard(guildId, limit = 10, offset = 0) {
  return getDb()
    .prepare("SELECT * FROM user_levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ? OFFSET ?")
    .all(guildId, limit, offset);
}

export function getUserRank(guildId, userId) {
  const data = getUserLevel(guildId, userId);
  if (!data) return null;
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) + 1 as rank FROM user_levels WHERE guild_id = ? AND xp > ?"
    )
    .get(guildId, data.xp);
  return row?.rank ?? null;
}

export function getTotalUsersInLeaderboard(guildId) {
  return getDb()
    .prepare("SELECT COUNT(*) as cnt FROM user_levels WHERE guild_id = ?")
    .get(guildId).cnt;
}

export function addLevelRole(guildId, levelRequired, roleId) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM level_roles WHERE guild_id = ? AND level_required = ?")
    .get(guildId, levelRequired);
  if (existing) {
    db.prepare("UPDATE level_roles SET role_id = ? WHERE guild_id = ? AND level_required = ?").run(roleId, guildId, levelRequired);
  } else {
    db.prepare("INSERT INTO level_roles (guild_id, level_required, role_id) VALUES (?, ?, ?)").run(guildId, levelRequired, roleId);
  }
}

export function removeLevelRole(guildId, levelRequired) {
  getDb()
    .prepare("DELETE FROM level_roles WHERE guild_id = ? AND level_required = ?")
    .run(guildId, levelRequired);
}

export function listLevelRoles(guildId) {
  return getDb()
    .prepare("SELECT * FROM level_roles WHERE guild_id = ? ORDER BY level_required")
    .all(guildId);
}

export function getLevelRolesUpTo(guildId, level) {
  return getDb()
    .prepare("SELECT * FROM level_roles WHERE guild_id = ? AND level_required <= ? ORDER BY level_required")
    .all(guildId, level);
}
