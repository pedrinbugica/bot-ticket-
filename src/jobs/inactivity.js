import { getGuildConfig } from "../config/guildConfig.js";
import { listActiveTickets, deleteTicket } from "../db/tickets.js";
import { finalizeTicketClose } from "../tickets/closeTicket.js";

/**
 * Fecha tickets sem atividade conforme inactivity_hours por servidor (0 = desligado).
 */
export function startInactivityJob(client) {
  const intervalMs = 15 * 60 * 1000;

  setInterval(async () => {
    const now = Date.now();

    for (const row of listActiveTickets()) {
      await new Promise((resolve) => setImmediate(resolve));

      const guildConfig = await getGuildConfig(row.guild_id);
      const hours = guildConfig.inactivityHours;
      if (!hours || hours <= 0) continue;

      const ms = hours * 60 * 60 * 1000;
      const last = new Date(row.last_activity_at).getTime();
      if (now - last < ms) continue;

      const guild = client.guilds.cache.get(row.guild_id);
      if (!guild) {
        deleteTicket(row.channel_id);
        continue;
      }

      const channel = await guild.channels.fetch(row.channel_id).catch(() => null);
      if (!channel?.isTextBased()) {
        deleteTicket(row.channel_id);
        continue;
      }

      try {
        await finalizeTicketClose({
          interaction: { guild, user: client.user },
          channel,
          closer: client.user,
          closeReason: `Inatividade (${hours}h)`,
          notifyChannel: false,
          inactivityClose: true,
        });
      } catch (err) {
        console.error(`Inatividade: falha ao fechar ${row.channel_id}:`, err);
      }
    }
  }, intervalMs);

  console.log("Job de inatividade ativo (configurável por servidor em /config painel)");
}
