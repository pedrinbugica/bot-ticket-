import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import {
  getGuildConfig,
  getTicketTypes,
  isGuildConfigured,
} from "../config/guildConfig.js";
import { interactionMemberCanPostTicketPanel } from "../util/permissions.js";
import { ticketTypeSelectOption } from "../util/emoji.js";

export const SELECT_CUSTOM_ID = "ticket_select_type";

export function buildPanelEmbed(guild, guildConfig) {
  let description =
    `Bem-vindo(a) ao **${guild.name}**.\n\n` +
    `Selecione abaixo o **tipo de ticket** para abrir um canal privado com a equipe.`;

  if (guildConfig.panelDescription?.trim()) {
    description += `\n\n${guildConfig.panelDescription.trim()}`;
  }
  if (guildConfig.panelRules?.trim()) {
    description += `\n\n**Regras**\n${guildConfig.panelRules.trim()}`;
  }

  const embed = new EmbedBuilder()
    .setColor(guildConfig.ticketPanelColor)
    .setTitle(guildConfig.panelTitle)
    .setDescription(description)
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .setFooter({
      text: guildConfig.panelFooter ?? `${guild.name} · Atendimento`,
    })
    .setTimestamp();

  if (guildConfig.panelImageUrl) {
    embed.setImage(guildConfig.panelImageUrl);
  }

  return embed;
}

export function buildTicketTypeSelectRow(types) {
  if (!types.length) return null;
  const select = new StringSelectMenuBuilder()
    .setCustomId(SELECT_CUSTOM_ID)
    .setPlaceholder("Escolha o tipo de ticket…")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(types.slice(0, 25).map(ticketTypeSelectOption));

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

  const guildConfig = await getGuildConfig(interaction.guild.id);
  if (!isGuildConfigured(guildConfig)) {
    await interaction.reply({
      content:
        "Configure o bot antes do painel com `/config painel`.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const types = await getTicketTypes(interaction.guild.id);
  if (!types.length) {
    await interaction.reply({
      content: "Nenhum tipo de ticket cadastrado. Use `/config painel` → Tipos de ticket.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = buildPanelEmbed(interaction.guild, guildConfig);
  const row = buildTicketTypeSelectRow(types);

  await interaction.reply({
    embeds: [embed],
    components: row ? [row] : [],
  });
}
