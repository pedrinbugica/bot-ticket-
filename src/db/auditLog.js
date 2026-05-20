import { getDb } from "./index.js";

export const ALL_EVENTS = [
  "message_edit",
  "message_delete",
  "member_join",
  "member_leave",
  "member_ban",
  "member_unban",
  "role_change",
  "nickname_change",
];

const cache = new Map();
const CACHE_TTL = 60_000;

export function getLogSettings(guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.row;

  const row = getDb()
    .prepare("SELECT * FROM log_settings WHERE guild_id = ?")
    .get(guildId) ?? null;

  cache.set(guildId, { row, ts: Date.now() });
  return row;
}

export function upsertLogSettings(guildId, patch) {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM log_settings WHERE guild_id = ?").get(guildId);

  if (!existing) {
    db.prepare(
      "INSERT INTO log_settings (guild_id, log_channel_id, events_enabled) VALUES (?, ?, ?)"
    ).run(
      guildId,
      patch.log_channel_id ?? null,
      patch.events_enabled ?? JSON.stringify(ALL_EVENTS)
    );
  } else {
    const updates = [];
    const values = [];
    if ("log_channel_id" in patch) { updates.push("log_channel_id = ?"); values.push(patch.log_channel_id); }
    if ("events_enabled" in patch) { updates.push("events_enabled = ?"); values.push(patch.events_enabled); }
    if (updates.length) {
      db.prepare(`UPDATE log_settings SET ${updates.join(", ")} WHERE guild_id = ?`).run(...values, guildId);
    }
  }

  cache.delete(guildId);
}

export function invalidateLogCache(guildId) {
  cache.delete(guildId);
}

export function isEventEnabled(guildId, eventType) {
  const row = getLogSettings(guildId);
  if (!row?.log_channel_id) return false;
  try {
    return JSON.parse(row.events_enabled ?? "[]").includes(eventType);
  } catch {
    return false;
  }
}

export function toggleEvent(guildId, eventType) {
  const row = getLogSettings(guildId);
  let current = [];
  try { current = JSON.parse(row?.events_enabled ?? "[]"); } catch { /* */ }

  const updated = current.includes(eventType)
    ? current.filter((e) => e !== eventType)
    : [...current, eventType];

  upsertLogSettings(guildId, { events_enabled: JSON.stringify(updated) });
  return updated.includes(eventType);
}
