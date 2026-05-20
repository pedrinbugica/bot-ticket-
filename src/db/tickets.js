import { getDb } from "./index.js";

export function insertTicket(record) {
  getDb()
    .prepare(
      `INSERT INTO tickets (
        channel_id, guild_id, opener_id, type_value, opened_at, last_activity_at,
        close_requested, claimed_by, subject, form_body
      ) VALUES (
        @channel_id, @guild_id, @opener_id, @type_value, @opened_at, @last_activity_at,
        @close_requested, @claimed_by, @subject, @form_body
      )`
    )
    .run(record);
}

export function getTicket(channelId) {
  return getDb().prepare("SELECT * FROM tickets WHERE channel_id = ?").get(channelId);
}

export function getOpenTicketForUser(guildId, userId) {
  return getDb()
    .prepare(
      "SELECT channel_id FROM tickets WHERE guild_id = ? AND opener_id = ? LIMIT 1"
    )
    .get(guildId, userId);
}

export function updateTicket(channelId, patch) {
  const fields = [];
  const values = [];
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (!fields.length) return;
  values.push(channelId);
  getDb()
    .prepare(`UPDATE tickets SET ${fields.join(", ")} WHERE channel_id = ?`)
    .run(...values);
}

export function deleteTicket(channelId) {
  getDb().prepare("DELETE FROM tickets WHERE channel_id = ?").run(channelId);
}

export function listActiveTickets() {
  return getDb().prepare("SELECT * FROM tickets").all();
}

export function getStats(guildId) {
  const opened = getDb()
    .prepare("SELECT COUNT(*) AS c FROM ticket_events WHERE guild_id = ? AND action = 'opened'")
    .get(guildId).c;
  const closed = getDb()
    .prepare("SELECT COUNT(*) AS c FROM ticket_events WHERE guild_id = ? AND action = 'closed'")
    .get(guildId).c;
  const active = getDb()
    .prepare("SELECT COUNT(*) AS c FROM tickets WHERE guild_id = ?")
    .get(guildId).c;
  return { opened, closed, active };
}
