import { getDb } from "./index.js";

export function logTicketEvent({ guildId, channelId, action, actorId, detail }) {
  getDb()
    .prepare(
      `INSERT INTO ticket_events (guild_id, channel_id, action, actor_id, detail)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(guildId, channelId ?? null, action, actorId ?? null, detail ?? null);
}
