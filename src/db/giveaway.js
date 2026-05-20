import { getDb } from "./index.js";

export function insertGiveaway({ guildId, channelId, prize, winnerCount, endsAt, createdBy }) {
  const result = getDb()
    .prepare(
      `INSERT INTO giveaways (guild_id, channel_id, prize, winner_count, ends_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(guildId, channelId, prize, winnerCount, endsAt, createdBy);
  return result.lastInsertRowid;
}

export function getGiveaway(id) {
  return getDb().prepare("SELECT * FROM giveaways WHERE id = ?").get(id) ?? null;
}

export function updateGiveawayMessageId(id, messageId) {
  getDb().prepare("UPDATE giveaways SET message_id = ? WHERE id = ?").run(messageId, id);
}

export function listActiveGiveaways(guildId) {
  return getDb()
    .prepare("SELECT * FROM giveaways WHERE guild_id = ? AND status = 'active' ORDER BY ends_at")
    .all(guildId);
}

export function getExpiredGiveaways() {
  return getDb()
    .prepare("SELECT * FROM giveaways WHERE status = 'active' AND ends_at <= datetime('now')")
    .all();
}

export function endGiveaway(id) {
  getDb().prepare("UPDATE giveaways SET status = 'ended' WHERE id = ?").run(id);
}

export function addEntry(giveawayId, userId) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?")
    .get(giveawayId, userId);
  if (existing) return false;
  db.prepare(
    "INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, datetime('now'))"
  ).run(giveawayId, userId);
  return true;
}

export function getEntryCount(giveawayId) {
  return getDb()
    .prepare("SELECT COUNT(*) as cnt FROM giveaway_entries WHERE giveaway_id = ?")
    .get(giveawayId).cnt;
}

export function getRandomWinners(giveawayId, count) {
  return getDb()
    .prepare("SELECT user_id FROM giveaway_entries WHERE giveaway_id = ? ORDER BY RANDOM() LIMIT ?")
    .all(giveawayId, count);
}
