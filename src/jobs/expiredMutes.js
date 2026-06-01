import { listExpiredMutes, listExpiredBans, deactivateInfraction } from "../db/infractions.js";

export function startExpiredActionsJob(client) {
  setInterval(async () => {
    for (const row of listExpiredMutes()) {
      try {
        const guild = client.guilds.cache.get(row.guild_id);
        if (!guild) { deactivateInfraction(row.id); continue; }
        const member = await guild.members.fetch(row.user_id).catch(() => null);
        if (member?.isCommunicationDisabled()) {
          await member.timeout(null, "Mute expirado").catch(() => null);
        }
        deactivateInfraction(row.id);
      } catch (err) {
        console.error(`expiredMutes: erro ao processar caso ${row.id}:`, err);
      }
    }

    for (const row of listExpiredBans()) {
      try {
        const guild = client.guilds.cache.get(row.guild_id);
        if (!guild) { deactivateInfraction(row.id); continue; }
        await guild.members.unban(row.user_id, "Tempban expirado").catch(() => null);
        deactivateInfraction(row.id);
      } catch (err) {
        console.error(`expiredBans: erro ao processar caso ${row.id}:`, err);
      }
    }
  }, 5 * 60 * 1000);

  console.log("Job de punições expiradas ativo (intervalo: 5 min)");
}
