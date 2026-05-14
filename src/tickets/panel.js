import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import { config } from "../config.js";
import { TICKET_TYPES } from "../constants/ticketTypes.js";
import { interactionMemberCanPostTicketPanel } from "../util/permissions.js";

export const SELECT_CUSTOM_ID = "ticket_select_type";

export function buildPanelEmbed(guild) {
  const embed = new EmbedBuilder()
    .setColor(config.ticketPanelColor)
    .setTitle("Central de atendimento")
    .setDescription(
      `Bem-vindo(a) ao **${guild.name}**.\n\n` +
        `Selecione abaixo o **tipo de ticket** para abrir um canal privado com a equipe.\n\n` +
        `**Regras**\n${config.ticketRules}`
    )
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .setFooter({ text: `${guild.name} · Atendimento` })
    .setTimestamp();

  return embed;
}

export function buildTicketTypeSelectRow() {
  const select = new StringSelectMenuBuilder()
    .setCustomId(SELECT_CUSTOM_ID)
    .setPlaceholder("Escolha o tipo de ticket…")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      TICKET_TYPES.map((t) => ({
        value: t.value,
        label: t.label,
        description: t.description,
        emoji: t.emoji,
      }))
    );

  return new ActionRowBuilder().addComponents(select);
}

export async function handleTicketPanelCommand(interaction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Use este comando dentro de um servidor.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!(await interactionMemberCanPostTicketPanel(interaction))) {
    await interaction.reply({
      content: "Apenas **administradores** do servidor podem enviar o painel de tickets.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = buildPanelEmbed(interaction.guild);
  const row = buildTicketTypeSelectRow();

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
}
