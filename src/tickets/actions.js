import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getTicket } from "../db/tickets.js";
import { updateTicket } from "../db/tickets.js";
import {
  buildControlEmbed,
  buildControlRows,
  parseTicketTopic,
} from "./open.js";
import { getGuildConfig, getTicketType } from "../config/guildConfig.js";
import {
  interactionMemberCanManageTickets,
  memberCanManageTickets,
} from "../util/permissions.js";
import { logTicketAction } from "./logAction.js";
import { finalizeTicketClose } from "./closeTicket.js";

export const CLOSE_REASON_MODAL_ID = "ticket_close_reason_modal";

const CLOSE_REASON_MODAL = new ModalBuilder()
  .setCustomId(CLOSE_REASON_MODAL_ID)
  .setTitle("Encerrar ticket")
  .addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("reason")
        .setLabel("Motivo do encerramento (opcional)")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(false)
    )
  );

async function safeEphemeralReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    if (err.code === 10008 || err.code === 10062) {
      await interaction
        .followUp({ ...payload, flags: MessageFlags.Ephemeral })
        .catch(() => null);
    } else {
      throw err;
    }
  }
}

function controlRow() {
  return buildControlRows();
}

function confirmRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_close_cancel")
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticket_close_confirm")
      .setLabel("Confirmar encerramento")
      .setStyle(ButtonStyle.Danger)
  );
}

function embedAlreadyClaimed(embed) {
  const fields = embed.fields ?? embed.data?.fields ?? [];
  return fields.some((f) => f.name === "Assumido por");
}

async function rebuildControlMessage(interaction, patch = {}) {
  const channel = interaction.channel;
  const meta = parseTicketTopic(channel.topic ?? "");
  const ticketRow = getTicket(channel.id);
  const guildConfig = await getGuildConfig(interaction.guild.id);
  const opener = await interaction.guild.members.fetch(meta.openerId).catch(() => null);
  const typeInfo = await getTicketType(interaction.guild.id, meta.typeValue);

  const embed = buildControlEmbed({
    guild: interaction.guild,
    guildConfig,
    openerMember: opener ?? { id: meta.openerId, toString: () => `<@${meta.openerId}>` },
    typeValue: meta.typeValue,
    typeInfo,
    openedAt: new Date(channel.createdTimestamp),
    subject: ticketRow?.subject,
    formBody: ticketRow?.form_body,
    closeRequested: Boolean(ticketRow?.close_requested),
    claimedBy: ticketRow?.claimed_by,
    ...patch,
  });

  const payload = { embeds: [embed], components: controlRow() };
  if (interaction.message?.content) payload.content = interaction.message.content;
  return payload;
}

export async function handleTicketClaim(interaction) {
  if (interaction.customId !== "ticket_claim") return false;
  const channel = interaction.channel;
  if (!channel?.isTextBased?.() || !interaction.guild || !interaction.user) {
    await interaction.reply({ content: "Ação inválida aqui.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const meta = parseTicketTopic(channel.topic ?? "");
  if (!meta) {
    await interaction.reply({ content: "Este canal não é um ticket gerenciado pelo bot.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (!(await interactionMemberCanManageTickets(interaction))) {
    await interaction.reply({
      content: "Apenas a equipe de suporte ou o dono do servidor pode assumir tickets.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const baseEmbed = interaction.message?.embeds?.[0];
  if (!baseEmbed) {
    await interaction.reply({ content: "Mensagem de controle não encontrada.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (embedAlreadyClaimed(baseEmbed)) {
    await interaction.reply({ content: "Este ticket já foi assumido.", flags: MessageFlags.Ephemeral });
    return true;
  }

  updateTicket(channel.id, { claimed_by: interaction.user.id });

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  await logTicketAction(interaction.guild, {
    channelId: channel.id,
    action: "claimed",
    actor: interaction.user,
  });

  const payload = await rebuildControlMessage(interaction, {
    claimedBy: interaction.user.id,
  });
  await interaction.editReply(payload);
  return true;
}

export async function handleTicketRequestClose(interaction) {
  if (interaction.customId !== "ticket_request_close") return false;
  const channel = interaction.channel;
  if (!channel?.isTextBased?.() || !interaction.guild || !interaction.user) {
    await interaction.reply({ content: "Ação inválida.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const meta = parseTicketTopic(channel.topic ?? "");
  if (!meta) {
    await interaction.reply({ content: "Canal inválido.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (interaction.user.id !== meta.openerId) {
    await interaction.reply({
      content: "Apenas quem abriu o ticket pode solicitar o fechamento.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const ticketRow = getTicket(channel.id);
  if (ticketRow?.close_requested) {
    await interaction.reply({
      content: "O fechamento deste ticket já foi solicitado.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  updateTicket(channel.id, { close_requested: 1 });

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  await logTicketAction(interaction.guild, {
    channelId: channel.id,
    action: "close_requested",
    actor: interaction.user,
  });

  const guildConfig = await getGuildConfig(interaction.guild.id);
  const ping = guildConfig.supportRoleIds.map((id) => `<@&${id}>`).join(" ");
  await channel
    .send({
      content: `${ping}\n${interaction.user} solicitou o **fechamento** deste ticket.`,
    })
    .catch(() => null);

  const payload = await rebuildControlMessage(interaction, { closeRequested: true });
  await interaction.editReply(payload);
  return true;
}

export async function handleTicketCloseStep1(interaction) {
  if (interaction.customId !== "ticket_close") return false;
  const channel = interaction.channel;
  if (!channel?.isTextBased?.() || !interaction.guild || !interaction.user) {
    await interaction.reply({ content: "Ação inválida aqui.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const meta = parseTicketTopic(channel.topic ?? "");
  if (!meta) {
    await interaction.reply({ content: "Este canal não é um ticket gerenciado pelo bot.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (!(await interactionMemberCanManageTickets(interaction))) {
    await interaction.reply({
      content: "Apenas a equipe de suporte ou o dono do servidor pode fechar tickets.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const baseEmbed = interaction.message?.embeds?.[0];
  if (!baseEmbed) {
    await interaction.reply({ content: "Mensagem de controle não encontrada.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  const payload = {
    embeds: [EmbedBuilder.from(baseEmbed)],
    components: [confirmRow()],
  };
  if (interaction.message.content) payload.content = interaction.message.content;
  await interaction.editReply(payload);
  return true;
}

export async function handleTicketCloseCancel(interaction) {
  if (interaction.customId !== "ticket_close_cancel") return false;
  if (!interaction.channel?.isTextBased?.() || !interaction.guild || !interaction.user) {
    await interaction.reply({ content: "Ação inválida.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (!(await interactionMemberCanManageTickets(interaction))) {
    await interaction.reply({ content: "Sem permissão.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }
  const payload = await rebuildControlMessage(interaction);
  await interaction.editReply(payload);
  return true;
}

export async function handleTicketCloseConfirm(interaction) {
  if (interaction.customId !== "ticket_close_confirm") return false;
  if (!interaction.channel?.isTextBased?.() || !interaction.guild || !interaction.user) {
    await interaction.reply({ content: "Ação inválida.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const canClose =
    interaction.guild.ownerId === interaction.user.id ||
    (interaction.member &&
      (await memberCanManageTickets(interaction.member, interaction.guild.id)));

  if (!canClose) {
    await interaction.reply({ content: "Sem permissão.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.showModal(CLOSE_REASON_MODAL);
  return true;
}

export async function handleCloseReasonModal(interaction) {
  if (!interaction.isModalSubmit() || interaction.customId !== CLOSE_REASON_MODAL_ID) {
    return false;
  }

  const channel = interaction.channel;
  if (!channel?.isTextBased?.() || !interaction.guild || !interaction.user) {
    await interaction.reply({ content: "Ação inválida.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const reason = interaction.fields.getTextInputValue("reason")?.trim() || null;

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  if (!(await interactionMemberCanManageTickets(interaction))) {
    await safeEphemeralReply(interaction, { content: "Sem permissão." });
    return true;
  }

  try {
    const result = await finalizeTicketClose({
      interaction,
      channel,
      closer: interaction.user,
      closeReason: reason,
    });

    const replyText = result.deleteFailed
      ? "Ticket encerrado, mas não foi possível excluir o canal automaticamente."
      : result.logSent
        ? "Ticket encerrado. Log, transcript .txt e .html enviados ao canal de registro."
        : "Ticket encerrado. Transcripts anexos aqui (configure `/config log`).";

    await safeEphemeralReply(interaction, {
      content: replyText,
      files: result.files,
    });
  } catch (err) {
    console.error("Erro ao fechar ticket:", err);
    await safeEphemeralReply(interaction, {
      content: "Falha ao encerrar o ticket. Verifique permissões do bot no canal.",
    });
  }

  return true;
}
