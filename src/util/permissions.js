import { PermissionFlagsBits } from "discord.js";
import { getGuildConfig } from "../config/guildConfig.js";

export async function memberIsStaff(member, guildId) {
  if (!member?.roles) return false;
  const cfg = await getGuildConfig(guildId);
  if (!cfg.supportRoleIds.length) return false;
  for (const roleId of cfg.supportRoleIds) {
    if (member.roles.cache.has(String(roleId))) return true;
  }
  return false;
}

export async function memberCanManageTickets(member, guildId) {
  if (!member) return false;
  return memberIsStaff(member, guildId);
}

export async function interactionMemberCanManageTickets(interaction) {
  if (!interaction.guild || !interaction.user) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;

  const member =
    interaction.member ??
    (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));

  return member ? memberCanManageTickets(member, interaction.guild.id) : false;
}

export async function interactionMemberCanPostTicketPanel(interaction) {
  if (!interaction.guild || !interaction.user) return false;

  const member =
    interaction.member ??
    (await interaction.guild.members.fetch(interaction.user.id).catch(() => null));

  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}
