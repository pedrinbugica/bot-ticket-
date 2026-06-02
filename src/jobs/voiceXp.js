import { getLevelSettings, addXp, getUserLevel, setLevel, getLevelRolesUpTo, getXpMultipliers } from "../db/leveling.js";
import { calcLevel } from "../leveling/leveling.js";

async function handleLevelUp(member, newLevel, settings, guild) {
  const rewards = getLevelRolesUpTo(guild.id, newLevel);
  for (const lr of rewards) {
    if (!member.roles.cache.has(lr.role_id)) {
      await member.roles.add(lr.role_id).catch(() => null);
    }
  }
  if (settings.levelup_channel_id) {
    const ch = guild.channels.cache.get(settings.levelup_channel_id);
    if (ch) await ch.send(`🎤 ${member} subiu para o **nível ${newLevel}** por tempo em voz! 🏆`).catch(() => null);
  }
}

async function processVoiceXp(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const settings = getLevelSettings(guild.id);
      if (!settings.enabled || !settings.voice_xp_enabled) continue;

      const base = settings.voice_xp_per_minute ?? 10;
      const multipliers = getXpMultipliers(guild.id);

      for (const [, channel] of guild.channels.cache) {
        if (!channel.isVoiceBased?.()) continue;
        if (channel.id === guild.afkChannelId) continue;

        const chMult = multipliers.find((m) => m.target_type === "channel" && m.target_id === channel.id)?.multiplier ?? 1;

        for (const [, member] of channel.members) {
          if (member.user.bot) continue;
          if (member.voice.deaf || member.voice.selfDeaf) continue;

          const roleMult = multipliers
            .filter((m) => m.target_type === "role" && member.roles.cache.has(m.target_id))
            .reduce((max, m) => Math.max(max, m.multiplier), 1);

          const xpGain = Math.max(1, Math.round(base * Math.max(chMult, roleMult)));
          const before = getUserLevel(guild.id, member.id);
          const oldLevel = before?.level ?? 0;
          const newXp = addXp(guild.id, member.id, xpGain);
          const newLevel = calcLevel(newXp);

          if (newLevel > oldLevel) {
            setLevel(guild.id, member.id, newLevel);
            await handleLevelUp(member, newLevel, settings, guild).catch(() => null);
          }
        }
      }
    } catch (err) {
      console.error(`voiceXp error (${guild.id}):`, err);
    }
  }
}

export function startVoiceXpJob(client) {
  setInterval(() => processVoiceXp(client).catch(() => null), 60 * 1000);
  console.log("Job de XP em voz ativo (intervalo: 1 min)");
}
