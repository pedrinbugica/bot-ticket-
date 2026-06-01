import { getDb } from "./index.js";

function nextCaseNumber(guildId) {
  const row = getDb()
    .prepare("SELECT MAX(case_number) as max FROM infractions WHERE guild_id = ?")
    .get(guildId);
  return (row?.max ?? 0) + 1;
}

export function insertInfraction({ guildId, userId, modId, action, reason, duration, expiresAt }) {
  const db = getDb();
  const caseNumber = nextCaseNumber(guildId);
  const result = db
    .prepare(
      `INSERT INTO infractions
       (case_number, guild_id, user_id, mod_id, action, reason, duration, expires_at, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
    )
    .run(caseNumber, guildId, userId, modId, action, reason ?? null, duration ?? null, expiresAt ?? null);
  return { id: result.lastInsertRowid, caseNumber };
}

export function getInfractionsByUser(guildId, userId) {
  return getDb()
    .prepare(
      "SELECT * FROM infractions WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 25"
    )
    .all(guildId, userId);
}

export function getInfractionByCase(guildId, caseNumber) {
  return getDb()
    .prepare("SELECT * FROM infractions WHERE guild_id = ? AND case_number = ?")
    .get(guildId, Number(caseNumber));
}

export function deactivateInfraction(id) {
  getDb().prepare("UPDATE infractions SET active = 0 WHERE id = ?").run(id);
}

export function countActiveWarns(guildId, userId) {
  return getDb()
    .prepare("SELECT COUNT(*) AS c FROM infractions WHERE guild_id = ? AND user_id = ? AND action = 'warn' AND active = 1")
    .get(guildId, userId).c;
}

export function listExpiredMutes() {
  return getDb()
    .prepare(
      "SELECT * FROM infractions WHERE action = 'mute' AND active = 1 AND expires_at IS NOT NULL AND expires_at <= datetime('now')"
    )
    .all();
}

export function listExpiredBans() {
  return getDb()
    .prepare(
      "SELECT * FROM infractions WHERE action = 'tempban' AND active = 1 AND expires_at IS NOT NULL AND expires_at <= datetime('now')"
    )
    .all();
}

export function getRecentCases(guildId, limit = 10) {
  return getDb()
    .prepare("SELECT * FROM infractions WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(guildId, limit);
}
