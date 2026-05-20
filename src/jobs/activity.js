import { parseTicketTopic } from "../tickets/open.js";
import { updateTicket } from "../db/tickets.js";

export function registerActivityTracking(client) {
  client.on("messageCreate", (message) => {
    if (message.author.bot || !message.guild || !message.channel?.isTextBased()) return;
    const meta = parseTicketTopic(message.channel.topic ?? "");
    if (!meta) return;
    updateTicket(message.channel.id, {
      last_activity_at: new Date().toISOString(),
    });
  });
}
