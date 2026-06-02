import { getPendingMessages, markMessageSent } from "../db/scheduled.js";

export function startScheduledJob(client) {
  setInterval(async () => {
    for (const msg of getPendingMessages()) {
      markMessageSent(msg.id);
      try {
        const guild = client.guilds.cache.get(msg.guild_id);
        if (!guild) continue;
        const channel = guild.channels.cache.get(msg.channel_id)
          ?? await guild.channels.fetch(msg.channel_id).catch(() => null);
        if (channel?.isTextBased()) await channel.send(msg.content);
      } catch (err) {
        console.error(`scheduledJob: erro na mensagem ${msg.id}:`, err);
      }
    }
  }, 60 * 1000);
  console.log("Job de mensagens agendadas ativo (verifica a cada 1 min)");
}
