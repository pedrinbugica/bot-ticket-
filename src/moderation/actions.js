import { EmbedBuilder } from "discord.js";
import { insertInfraction } from "../db/infractions.js";

const ACTION_COLORS = { warn: 0xffa500, mute: 0xff6600, kick: 0xff4400, ban: 0xff0000 };

const ACTION_LABELS = {
  warn: "Aviso recebido",
  mute: "Você foi silenciado",
  kick: "Você foi removido do servidor",
  ban: "Você foi banido do servidor",
};

export function parseDuration(str) {
  const match = String(str ?? "").trim().match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const mul = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * mul[unit];
}

export function formatDuration(ms) {
  if (!ms || ms <= 0) return "permanente";
  const parts = [];
  const d = Math.floor(ms / 86_400_000); if (d) parts.push(`${d}d`);
  const h = Math.floor((ms % 86_400_000) / 3_600_000); if (h) parts.push(`${h}h`);
  const m = Math.floor((ms % 3_600_000) / 60_000); if (m) parts.push(`${m}m`);
  return parts.join(" ") || "< 1m";
}

function buildDmEmbed({ action, guildName, reason, caseNumber, durationMs }) {
  const embed = new EmbedBuilder()
    .setColor(ACTION_COLORS[action] ?? 0x888888)
    .setTitle(ACTION_LABELS[action] ?? action)
    .addFields(
      { name: "Servidor", value: guildName, inline: true },
      { name: "Caso #", value: String(caseNumber), inline: true },
      { name: "Motivo", value: reason ?? "Nenhum motivo informado.", inline: false }
    )
    .setTimestamp();
  if (durationMs) embed.addFields({ name: "Duração", value: formatDuration(durationMs), inline: true });
  return embed;
}

async function tryDm(user, embed) {
  try { await user.send({ embeds: [embed] }); return true; } catch { return false; }
}

export async function warnMember({ guild, target, moderator, reason }) {
  const { caseNumber } = insertInfraction({
    guildId: guild.id, userId: target.id, modId: moderator.id,
    action: "warn", reason,
  });
  const user = target.user ?? target;
  const dmSent = await tryDm(user, buildDmEmbed({ action: "warn", guildName: guild.name, reason, caseNumber }));
  return { caseNumber, dmSent };
}

export async function muteMember({ guild, target, moderator, reason, durationMs }) {
  const MAX_MS = 28 * 24 * 60 * 60 * 1000;
  const clampedMs = Math.min(durationMs, MAX_MS);
  const expiresAt = new Date(Date.now() + clampedMs).toISOString();

  await target.timeout(clampedMs, reason ?? "Moderação");

  const { caseNumber } = insertInfraction({
    guildId: guild.id, userId: target.id, modId: moderator.id,
    action: "mute", reason,
    duration: Math.floor(clampedMs / 60_000),
    expiresAt,
  });
  const user = target.user ?? target;
  const dmSent = await tryDm(user, buildDmEmbed({ action: "mute", guildName: guild.name, reason, caseNumber, durationMs: clampedMs }));
  return { caseNumber, dmSent };
}

export async function kickMember({ guild, target, moderator, reason }) {
  const user = target.user ?? target;
  const { caseNumber } = insertInfraction({
    guildId: guild.id, userId: target.id, modId: moderator.id,
    action: "kick", reason,
  });
  await tryDm(user, buildDmEmbed({ action: "kick", guildName: guild.name, reason, caseNumber }));
  await target.kick(reason ?? "Moderação");
  return { caseNumber };
}

export async function banMember({ guild, target, moderator, reason, deleteMessageDays = 0 }) {
  const userId = target.id;
  const user = target.user ?? target;
  const { caseNumber } = insertInfraction({
    guildId: guild.id, userId, modId: moderator.id,
    action: "ban", reason,
  });
  await tryDm(user, buildDmEmbed({ action: "ban", guildName: guild.name, reason, caseNumber }));
  await guild.members.ban(userId, {
    reason: reason ?? "Moderação",
    deleteMessageSeconds: deleteMessageDays * 86_400,
  });
  return { caseNumber };
}
