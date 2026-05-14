import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import { OverwriteType } from "discord-api-types/v10";
import { config } from "../config.js";
import { getTicketType } from "../constants/ticketTypes.js";
import { SELECT_CUSTOM_ID } from "./panel.js";

const TOPIC_PREFIX = "ticketMeta:";

export function buildTicketTopic({ openerId, typeValue }) {
  return `${TOPIC_PREFIX}openerId=${openerId};type=${typeValue}`;
}

export function parseTicketTopic(topic) {
  if (!topic || !topic.startsWith(TOPIC_PREFIX)) return null;
  const rest = topic.slice(TOPIC_PREFIX.length);
  const openerMatch = rest.match(/openerId=(\d+)/);
  const typeMatch = rest.match(/type=([^;]+)/);
  if (!openerMatch) return null;
  return {
    openerId: openerMatch[1],
    typeValue: typeMatch ? typeMatch[1].trim() : "suporte",
  };
}

function channelNameForTicket(userId, typeSlug) {
  const slug = typeSlug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || "ticket";
  const base = `ticket-${userId}-${slug}`;
  return base.toLowerCase().slice(0, 100);
}

function findOpenTicketForUser(guild, userId) {
  const prefix = `ticket-${userId}-`;
  return guild.channels.cache.find(
    (c) =>
      c.parentId === config.ticketCategoryId &&
      c.type === ChannelType.GuildText &&
      c.name.startsWith(prefix)
  );
}

function buildPermissionOverwrites(guild, member, clientUserId) {
  const list = [
    {
      id: guild.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  const ownerId = guild.ownerId;
  if (ownerId && ownerId !== member.id) {
    list.push({
      id: ownerId,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  list.push({
    id: clientUserId,
    type: OverwriteType.Member,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ReadMessageHistory,
    ],
  });

  for (const roleId of config.supportRoleIds) {
    list.push({
      id: roleId,
      type: OverwriteType.Role,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    });
  }

  return list;
}

function buildControlEmbed({ guild, openerMember, typeValue, openedAt }) {
  const typeInfo = getTicketType(typeValue);
  const typeLabel = typeInfo ? `${typeInfo.emoji} ${typeInfo.label}` : typeValue;

  return new EmbedBuilder()
    .setColor(config.ticketPanelColor)
    .setTitle("Ticket aberto")
    .setDescription(
      "Descreva seu problema com o máximo de detalhes possível. A equipe responderá em breve.\n\n" +
        "**Equipe e dono do servidor:** use os botões abaixo para assumir ou encerrar o ticket."
    )
    .addFields(
      { name: "Autor", value: `${openerMember} (\`${openerMember.id}\`)`, inline: true },
      { name: "Tipo", value: typeLabel, inline: true },
      { name: "Aberto em", value: `<t:${Math.floor(openedAt.getTime() / 1000)}:F>`, inline: true },
      { name: "Servidor", value: `${guild.name} (\`${guild.id}\`)`, inline: false }
    )
    .setFooter({ text: "Painel de controle do ticket" })
    .setTimestamp(openedAt);
}

function buildControlRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel("Assumir")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("Fechar ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

export async function handleTicketTypeSelect(interaction, client) {
  if (!interaction.isStringSelectMenu() || interaction.customId !== SELECT_CUSTOM_ID) {
    return false;
  }

  const guild = interaction.guild;
  const member = interaction.member;
  if (!guild || !member) {
    await interaction.reply({
      content: "Esta ação só funciona em um servidor.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const typeValue = interaction.values[0];
  if (!getTicketType(typeValue)) {
    await interaction.reply({ content: "Tipo de ticket inválido.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  await guild.channels.fetch().catch(() => null);

  const duplicate = findOpenTicketForUser(guild, member.id);
  if (duplicate) {
    await interaction.editReply({
      content: `Você já possui um ticket aberto: ${duplicate}`,
    });
    return true;
  }

  const category = await guild.channels.fetch(config.ticketCategoryId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.editReply({
      content:
        "Categoria de tickets inválida ou inacessível. Verifique **TICKET_CATEGORY_ID** e as permissões do bot.",
    });
    return true;
  }

  if (!config.supportRoleIds.length) {
    await interaction.editReply({
      content:
        "Nenhum cargo de suporte configurado. Defina **SUPPORT_ROLE_IDS** (ou **SUPPORT_ROLE_ID**) no arquivo `.env`.",
    });
    return true;
  }

  const channelName = channelNameForTicket(member.id, typeValue);
  const topic = buildTicketTopic({ openerId: member.id, typeValue });

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      permissionOverwrites: buildPermissionOverwrites(guild, member, client.user.id),
      topic,
    });
  } catch (err) {
    console.error("Erro ao criar canal de ticket:", err);
    await interaction.editReply({
      content:
        "Não foi possível criar o ticket. Verifique se o bot tem permissão **Gerenciar canais** e se o servidor não atingiu o limite de canais.",
    });
    return true;
  }

  const openedAt = new Date();
  const embed = buildControlEmbed({
    guild,
    openerMember: member,
    typeValue,
    openedAt,
  });
  const row = buildControlRow();

  const mentions = [
    member.toString(),
    ...config.supportRoleIds.map((id) => `<@&${id}>`),
  ].join(" ");

  await channel.send({
    content: mentions,
    embeds: [embed],
    components: [row],
  });

  await interaction.editReply({
    content: `Ticket criado: ${channel}`,
  });

  return true;
}
