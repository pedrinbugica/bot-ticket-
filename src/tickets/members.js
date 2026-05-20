import { MessageFlags, OverwriteType, PermissionFlagsBits } from "discord.js";
import { parseTicketTopic } from "./open.js";
import { interactionMemberCanManageTickets } from "../util/permissions.js";
import { logTicketAction } from "./logAction.js";
import { getStats } from "../db/tickets.js";

export async function handleTicketAddMember(interaction) {
  if (interaction.commandName !== "ticket" || interaction.options.getSubcommand() !== "add") {
    return false;
  }

  const channel = interaction.channel;
  const target = interaction.options.getUser("usuario", true);
  if (!channel?.isTextBased?.() || !interaction.guild) {
    await interaction.reply({ content: "Use em um canal de ticket.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const meta = parseTicketTopic(channel.topic ?? "");
  if (!meta) {
    await interaction.reply({ content: "Este canal não é um ticket.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (!(await interactionMemberCanManageTickets(interaction))) {
    await interaction.reply({ content: "Sem permissão.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await channel.permissionOverwrites.edit(target.id, {
    type: OverwriteType.Member,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles,
    ],
  });

  await logTicketAction(interaction.guild, {
    channelId: channel.id,
    action: "member_added",
    actor: interaction.user,
    detail: `Adicionado: ${target.tag} (${target.id})`,
  });

  await interaction.reply({
    content: `${target} foi adicionado ao ticket.`,
    flags: MessageFlags.Ephemeral,
  });
  return true;
}

export async function handleTicketRemoveMember(interaction) {
  if (interaction.commandName !== "ticket" || interaction.options.getSubcommand() !== "remove") {
    return false;
  }

  const channel = interaction.channel;
  const target = interaction.options.getUser("usuario", true);
  if (!channel?.isTextBased?.() || !interaction.guild) {
    await interaction.reply({ content: "Use em um canal de ticket.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const meta = parseTicketTopic(channel.topic ?? "");
  if (!meta) {
    await interaction.reply({ content: "Este canal não é um ticket.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (target.id === meta.openerId) {
    await interaction.reply({
      content: "Não é possível remover o autor do ticket.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (!(await interactionMemberCanManageTickets(interaction))) {
    await interaction.reply({ content: "Sem permissão.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await channel.permissionOverwrites.delete(target.id);

  await logTicketAction(interaction.guild, {
    channelId: channel.id,
    action: "member_removed",
    actor: interaction.user,
    detail: `Removido: ${target.tag} (${target.id})`,
  });

  await interaction.reply({
    content: `${target} foi removido do ticket.`,
    flags: MessageFlags.Ephemeral,
  });
  return true;
}

export async function handleTicketStats(interaction) {
  if (interaction.commandName !== "ticket" || interaction.options.getSubcommand() !== "stats") {
    return false;
  }

  if (!interaction.guild) {
    await interaction.reply({ content: "Use em um servidor.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const stats = getStats(interaction.guild.id);

  await interaction.reply({
    content:
      `**Estatísticas de tickets**\n` +
      `• Abertos (registrados): ${stats.opened}\n` +
      `• Encerrados: ${stats.closed}\n` +
      `• Ativos agora: ${stats.active}`,
    flags: MessageFlags.Ephemeral,
  });
  return true;
}
