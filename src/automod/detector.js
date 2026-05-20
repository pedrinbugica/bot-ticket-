import { Events } from "discord.js";
import { getAutomodSettings } from "../db/automod.js";
import { warnMember, muteMember } from "../moderation/actions.js";
import { getLogSettings } from "../db/auditLog.js";

// guildId → Map(userId → timestamps[])
const spamTracker = new Map();
// guildId → timestamps[]
const raidTracker = new Map();

const INVITE_RE = /discord\.(gg|com\/invite)\/\S+/i;
const URL_RE = /https?:\/\/\S+/i;

function isExempt(member, channelId, settings) {
  if (member.permissions.has(8n)) return true; // Administrator
  const exemptRoles = JSON.parse(settings.exempt_role_ids || "[]");
  const exemptChannels = JSON.parse(settings.exempt_channel_ids || "[]");
  if (exemptChannels.includes(channelId)) return true;
  if (member.roles.cache.some((r) => exemptRoles.includes(r.id))) return true;
  return false;
}

function findBadWord(content, words) {
  const lower = content.toLowerCase();
  for (const { word, severity } of words) {
    if (lower.includes(word)) return { word, severity };
  }
  return null;
}

async function applyAction(severity, { guild, member, bot, reason }) {
  if (severity === "warn") {
    await warnMember({ guild, target: member, moderator: bot, reason });
  } else if (severity === "mute") {
    await muteMember({ guild, target: member, moderator: bot, reason, durationMs: 10 * 60 * 1000 });
  }
}

async function processMessage(message) {
  if (!message.guild || message.author.bot) return;
  if (!message.content) return;

  const { settings, words } = getAutomodSettings(message.guild.id);
  const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!member) return;
  if (isExempt(member, message.channelId, settings)) return;

  const bot = message.guild.members.me;
  const ctx = { guild: message.guild, member, bot };

  // Word filter
  if (settings.word_filter_enabled && words.length) {
    const match = findBadWord(message.content, words);
    if (match) {
      await message.delete().catch(() => null);
      await applyAction(match.severity, { ...ctx, reason: `Auto-mod: palavra proibida "${match.word}"` });
      return;
    }
  }

  // Link filter
  if (settings.link_filter_enabled) {
    if (INVITE_RE.test(message.content) || URL_RE.test(message.content)) {
      await message.delete().catch(() => null);
      await applyAction("warn", { ...ctx, reason: "Auto-mod: link não permitido" });
      return;
    }
  }

  // Mention spam
  if (settings.mention_limit > 0 && message.mentions.users.size >= settings.mention_limit) {
    await message.delete().catch(() => null);
    await applyAction("warn", { ...ctx, reason: `Auto-mod: excesso de menções (${message.mentions.users.size})` });
    return;
  }

  // Spam
  if (settings.spam_enabled) {
    const now = Date.now();
    const windowMs = settings.spam_window_secs * 1000;

    if (!spamTracker.has(message.guild.id)) spamTracker.set(message.guild.id, new Map());
    const guildMap = spamTracker.get(message.guild.id);

    const prev = guildMap.get(message.author.id) ?? [];
    const recent = prev.filter((t) => now - t < windowMs);
    recent.push(now);
    guildMap.set(message.author.id, recent);

    if (recent.length >= settings.spam_msg_count) {
      guildMap.delete(message.author.id);
      await message.delete().catch(() => null);
      await applyAction(settings.spam_action, { ...ctx, reason: "Auto-mod: spam detectado" });
    }
  }
}

async function processJoin(member) {
  const { settings } = getAutomodSettings(member.guild.id);
  if (!settings.raid_enabled) return;

  const now = Date.now();
  const windowMs = settings.raid_window_secs * 1000;

  const prev = raidTracker.get(member.guild.id) ?? [];
  const recent = prev.filter((t) => now - t < windowMs);
  recent.push(now);
  raidTracker.set(member.guild.id, recent);

  if (recent.length >= settings.raid_join_count) {
    raidTracker.set(member.guild.id, []);

    const logSettings = getLogSettings(member.guild.id);
    if (!logSettings?.log_channel_id) return;
    const ch = member.guild.channels.cache.get(logSettings.log_channel_id);
    if (!ch?.isTextBased()) return;

    await ch.send({
      content:
        `⚠️ **Possível raid detectado!** ${recent.length} membros entraram em ${settings.raid_window_secs}s.\n` +
        `Considere ativar o **Nível de verificação** do servidor ou aplicar slowmode nos canais.`,
    }).catch(() => null);
  }
}

export function registerAutomodEvents(client) {
  client.on(Events.MessageCreate, (msg) => {
    processMessage(msg).catch((err) => console.error("Automod message error:", err));
  });

  client.on(Events.GuildMemberAdd, (member) => {
    processJoin(member).catch((err) => console.error("Automod raid error:", err));
  });

  console.log("Auto-mod ativo");
}
