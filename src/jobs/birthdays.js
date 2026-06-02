import { getBirthdaysToday } from "../db/birthdays.js";

const announced = new Set();

async function checkBirthdays(client) {
  const today = new Date().toISOString().slice(0, 10);
  for (const row of getBirthdaysToday()) {
    const key = `${row.guild_id}:${row.user_id}:${today}`;
    if (announced.has(key)) continue;
    try {
      const guild = client.guilds.cache.get(row.guild_id);
      if (!guild) continue;
      const channel = guild.channels.cache.get(row.channel_id)
        ?? await guild.channels.fetch(row.channel_id).catch(() => null);
      if (!channel?.isTextBased()) continue;
      const member = await guild.members.fetch(row.user_id).catch(() => null);
      if (!member) continue;
      const msg = (row.message ?? "🎂 Feliz aniversário, {usuario}! 🎉").replace("{usuario}", `${member}`);
      await channel.send(msg);
      announced.add(key);
    } catch (err) {
      console.error("birthdaysJob error:", err);
    }
  }
}

export function startBirthdaysJob(client) {
  checkBirthdays(client);
  setInterval(() => checkBirthdays(client), 60 * 60 * 1000);
  console.log("Job de aniversários ativo (verifica a cada hora)");
}
