import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { OverwriteType } from "discord-api-types/v10";
import {
  getGuildConfig,
  getTicketType,
  isGuildConfigured,
} from "../config/guildConfig.js";
import { incrementTicketCounter } from "../db/guildSettings.js";
import { getOpenTicketForUser, insertTicket } from "../db/tickets.js";
import { SELECT_CUSTOM_ID } from "./panel.js";
import { setPendingOpen, takePendingOpen } from "./pendingOpen.js";
import { logTicketAction } from "./logAction.js";

export const OPEN_MODAL_ID = "ticket_open_modal";
export const TOPIC_PREFIX = "ticketMeta:";

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

function channelNameForTicket(guildId, userId, typeSlug, seq) {
  const slug = typeSlug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 16) || "ticket";
  const base = seq ? `${slug}-${String(seq).padStart(4, "0")}` : `ticket-${userId}-${slug}`;
  return base.toLowerCase().slice(0, 100);
}

function buildPermissionOverwrites(guild, member, clientUserId, supportRoleIds) {
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

  for (const roleId of supportRoleIds) {
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

export function buildControlEmbed({
  guild,
  guildConfig,
  openerMember,
  typeValue,
  typeInfo,
  openedAt,
  subject,
  formBody,
  closeRequested,
  claimedBy,
}) {
  const typeLabel = typeInfo ? `${typeInfo.emoji ?? ""} ${typeInfo.label}`.trim() : typeValue;
  const embed = new EmbedBuilder()
    .setColor(guildConfig.ticketPanelColor)
    .setTitle("Ticket aberto")
    .setDescription(
      "Descreva seu problema com o máximo de detalhes possível. A equipe responderá em breve.\n\n" +
        "**Equipe:** use os botões para assumir ou encerrar. **Autor:** pode solicitar fechamento."
    )
    .addFields(
      { name: "Autor", value: `${openerMember} (\`${openerMember.id}\`)`, inline: true },
      { name: "Tipo", value: typeLabel, inline: true },
      { name: "Aberto em", value: `<t:${Math.floor(openedAt.getTime() / 1000)}:F>`, inline: true }
    )
    .setFooter({ text: "Painel de controle do ticket" })
    .setTimestamp(openedAt);

  if (subject) embed.addFields({ name: "Assunto", value: subject.slice(0, 1024), inline: false });
  if (formBody) embed.addFields({ name: "Descrição", value: formBody.slice(0, 1024), inline: false });
  if (closeRequested) {
    embed.addFields({
      name: "Fechamento solicitado",
      value: "O autor pediu para encerrar este ticket.",
      inline: false,
    });
  }
  if (claimedBy) {
    embed.addFields({
      name: "Assumido por",
      value: `<@${claimedBy}> (\`${claimedBy}\`)`,
      inline: true,
    });
  }

  return embed;
}

export function buildControlRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_claim")
        .setLabel("Assumir")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Fechar ticket")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("ticket_request_close")
        .setLabel("Solicitar fechamento")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
}

export function buildOpenModal() {
  return new ModalBuilder()
    .setCustomId(OPEN_MODAL_ID)
    .setTitle("Abrir ticket")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("subject")
          .setLabel("Assunto")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Descreva seu problema")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true)
      )
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

  const [guildConfig, typeInfo, existing] = await Promise.all([
    getGuildConfig(guild.id),
    getTicketType(guild.id, typeValue),
    Promise.resolve(getOpenTicketForUser(guild.id, member.id)),
  ]);

  if (!isGuildConfigured(guildConfig)) {
    await interaction.reply({
      content: "O bot ainda não foi configurado neste servidor. Peça a um admin para usar `/config painel`.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (!typeInfo) {
    await interaction.reply({ content: "Tipo de ticket inválido.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (existing) {
    const ch =
      guild.channels.cache.get(existing.channel_id) ??
      (await guild.channels.fetch(existing.channel_id).catch(() => null));
    await interaction.reply({
      content: `Você já possui um ticket aberto: ${ch ?? `<#${existing.channel_id}>`}`,
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  setPendingOpen(member.id, guild.id, { typeValue });
  await interaction.showModal(buildOpenModal());
  return true;
}

async function replyOpenModal(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content });
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}

export async function handleOpenModalSubmit(interaction, client) {
  if (!interaction.isModalSubmit() || interaction.customId !== OPEN_MODAL_ID) return false;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const guild = interaction.guild;
  const member = interaction.member;
  if (!guild || !member) {
    await replyOpenModal(interaction, "Ação inválida.");
    return true;
  }

  const pending = takePendingOpen(member.id, guild.id);
  if (!pending) {
    await replyOpenModal(
      interaction,
      "Sessão expirada. Selecione o tipo de ticket novamente no painel."
    );
    return true;
  }

  const subject = interaction.fields.getTextInputValue("subject").trim();
  const formBody = interaction.fields.getTextInputValue("description").trim();
  const typeValue = pending.typeValue;

  const guildConfig = await getGuildConfig(guild.id);
  const typeInfo = await getTicketType(guild.id, typeValue);
  const parentId = typeInfo?.categoryId || guildConfig.ticketCategoryId;

  const category = await guild.channels.fetch(parentId).catch(() => null);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.editReply({
      content: "Categoria de tickets inválida ou inacessível. Use `/config categoria`.",
    });
    return true;
  }

  const seq = incrementTicketCounter(guild.id);
  const channelName = channelNameForTicket(guild.id, member.id, typeValue, seq);
  const topic = buildTicketTopic({ openerId: member.id, typeValue });

  let channel;
  try {
    channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites: buildPermissionOverwrites(
        guild,
        member,
        client.user.id,
        guildConfig.supportRoleIds
      ),
      topic,
    });
  } catch (err) {
    console.error("Erro ao criar canal de ticket:", err);
    await interaction.editReply({
      content:
        "Não foi possível criar o ticket. Verifique permissões **Gerenciar canais** e limite de canais.",
    });
    return true;
  }

  const openedAt = new Date();
  const iso = openedAt.toISOString();
  insertTicket({
    channel_id: channel.id,
    guild_id: guild.id,
    opener_id: member.id,
    type_value: typeValue,
    opened_at: iso,
    last_activity_at: iso,
    close_requested: 0,
    claimed_by: null,
    subject,
    form_body: formBody,
  });

  const embed = buildControlEmbed({
    guild,
    guildConfig,
    openerMember: member,
    typeValue,
    typeInfo,
    openedAt,
    subject,
    formBody,
  });

  const mentions = [
    member.toString(),
    ...guildConfig.supportRoleIds.map((id) => `<@&${id}>`),
  ].join(" ");

  await channel.send({
    content: mentions,
    embeds: [embed],
    components: buildControlRows(),
  });

  await logTicketAction(guild, {
    channelId: channel.id,
    action: "opened",
    actor: member.user,
    detail: `Tipo: ${typeInfo?.label ?? typeValue} · Assunto: ${subject}`,
  });

  await interaction.editReply({ content: `Ticket criado: ${channel}` });
  return true;
}
