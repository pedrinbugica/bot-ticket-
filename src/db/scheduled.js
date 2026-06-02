import { getDb } from "./index.js";

export function insertScheduledMessage({ guildId, channelId, content, sendAt, createdBy }) {
  return getDb()
    .prepare("INSERT INTO scheduled_messages (guild_id, channel_id, content, send_at, created_by) VALUES (?, ?, ?, ?, ?)")
    .run(guildId, channelId, content, sendAt, createdBy).lastInsertRowid;
}

export function listScheduledMessages(guildId) {
  return getDb()
    .prepare("SELECT * FROM scheduled_messages WHERE guild_id = ? AND sent = 0 ORDER BY send_at ASC")
    .all(guildId);
}

export function cancelScheduledMessage(guildId, id) {
  return getDb()
    .prepare("DELETE FROM scheduled_messages WHERE guild_id = ? AND id = ? AND sent = 0")
    .run(guildId, id).changes;
}

export function getPendingMessages() {
  return getDb()
    .prepare("SELECT * FROM scheduled_messages WHERE sent = 0 AND send_at <= datetime('now')")
    .all();
}

export function markMessageSent(id) {
  getDb().prepare("UPDATE scheduled_messages SET sent = 1 WHERE id = ?").run(id);
}
