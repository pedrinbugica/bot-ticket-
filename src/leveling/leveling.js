import { Events } from "discord.js";
import {
  getLevelSettings,
  getUserLevel,
  addXp,
  setLevel,
  getLevelRolesUpTo,
} from "../db/leveling.js";

export function calcLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100));
}

export function xpForLevel(level) {
  return level * level * 100;
}

export function xpForNextLevel(level) {
  return (level + 1) * (level + 1) * 100;
}

export function makeXpBar(xp, barLength = 10) {
  const level = calcLevel(xp);
  const prevXp = xpForLevel(level);
  const nextXp = xpForNextLevel(level);
  const progress = xp - prevXp;
  const needed = nextXp - prevXp;
  if (needed <= 0) return "█".repeat(barLength);
  const filled = Math.min(barLength, Math.round((progress / needed) * barLength));
  return "█".repeat(filled) + "░".repeat(barLength - filled);
}

// guildId → Map(userId → lastXpTimestamp ms)
const cooldowns = new Map();

async function processXp(message) {
  if (!message.guild || message.author.bot) return;
  if (!message.content) return;

  const settings = getLevelSettings(message.guild.id);
  if (!settings.enabled) return;

  const now = Date.now();
  const cooldownMs = (settings.xp_cooldown_secs ?? 60) * 1000;

  if (!cooldowns.has(message.guild.id)) cooldowns.set(message.guild.id, new Map());
  const guildCooldowns = cooldowns.get(message.guild.id);

  const lastXp = guildCooldowns.get(message.author.id) ?? 0;
  if (now - lastXp < cooldownMs) return;
  guildCooldowns.set(message.author.id, now);

  const xpGain = (settings.xp_per_message ?? 15) + Math.floor(Math.random() * 6);
  const before = getUserLevel(message.guild.id, message.author.id);
  const oldLevel = before?.level ?? 0;

  const newXp = addXp(message.guild.id, message.author.id, xpGain);
  const newLevel = calcLevel(newXp);

  if (newLevel > oldLevel) {
    setLevel(message.guild.id, message.author.id, newLevel);
    await onLevelUp(message, newLevel, settings);
  }
}

async function onLevelUp(message, newLevel, settings) {
  const member =
    message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) return;

  const rewards = getLevelRolesUpTo(message.guild.id, newLevel);
  for (const lr of rewards) {
    if (!member.roles.cache.has(lr.role_id)) {
      await member.roles.add(lr.role_id).catch(() => null);
    }
  }

  const channel = settings.levelup_channel_id
    ? (message.guild.channels.cache.get(settings.levelup_channel_id) ?? message.channel)
    : message.channel;

  await channel
    .send({ content: `🎉 ${message.author} subiu para o **nível ${newLevel}**! Parabéns! 🏆` })
    .catch(() => null);
}

export function registerLevelingEvents(client) {
  client.on(Events.MessageCreate, (msg) => {
    processXp(msg).catch((err) => console.error("Leveling error:", err));
  });

  console.log("Sistema de XP e níveis ativo");
}
