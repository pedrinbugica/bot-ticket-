import { getDb } from "./index.js";

export function insertPoll({ guildId, channelId, question, options, endsAt, createdBy }) {
  const result = getDb()
    .prepare(
      `INSERT INTO polls (guild_id, channel_id, question, options, ends_at, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(guildId, channelId, question, JSON.stringify(options), endsAt, createdBy);
  return result.lastInsertRowid;
}

export function getPoll(id) {
  return getDb().prepare("SELECT * FROM polls WHERE id = ?").get(id) ?? null;
}

export function updatePollMessageId(id, messageId) {
  getDb().prepare("UPDATE polls SET message_id = ? WHERE id = ?").run(messageId, id);
}

export function listActivePolls(guildId) {
  return getDb()
    .prepare("SELECT * FROM polls WHERE guild_id = ? AND status = 'active' ORDER BY ends_at")
    .all(guildId);
}

export function getExpiredPolls() {
  return getDb()
    .prepare("SELECT * FROM polls WHERE status = 'active' AND ends_at <= datetime('now')")
    .all();
}

export function endPoll(id) {
  getDb().prepare("UPDATE polls SET status = 'ended' WHERE id = ?").run(id);
}

export function castVote(pollId, userId, optionIndex) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id, option_index FROM poll_votes WHERE poll_id = ? AND user_id = ?")
    .get(pollId, userId);

  if (existing) {
    if (existing.option_index === optionIndex) return "same";
    db.prepare(
      "UPDATE poll_votes SET option_index = ?, voted_at = datetime('now') WHERE poll_id = ? AND user_id = ?"
    ).run(optionIndex, pollId, userId);
    return "changed";
  }

  db.prepare(
    "INSERT INTO poll_votes (poll_id, user_id, option_index, voted_at) VALUES (?, ?, ?, datetime('now'))"
  ).run(pollId, userId, optionIndex);
  return "new";
}

export function getVoteCounts(pollId, optionCount) {
  const rows = getDb()
    .prepare(
      "SELECT option_index, COUNT(*) as cnt FROM poll_votes WHERE poll_id = ? GROUP BY option_index"
    )
    .all(pollId);
  const counts = new Array(optionCount).fill(0);
  for (const row of rows) {
    if (row.option_index < optionCount) counts[row.option_index] = row.cnt;
  }
  return counts;
}

export function getTotalVotes(pollId) {
  return getDb()
    .prepare("SELECT COUNT(*) as cnt FROM poll_votes WHERE poll_id = ?")
    .get(pollId).cnt;
}
