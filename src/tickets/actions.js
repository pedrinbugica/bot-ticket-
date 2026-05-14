import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { config } from "../config.js";
import { getTicketType } from "../constants/ticketTypes.js";
import { parseTicketTopic } from "./open.js";
import { interactionMemberCanManageTickets } from "../util/permissions.js";
import { buildChannelTranscript } from "./transcript.js";

function controlRow() {
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
      content:
        "Apenas a **equipe de suporte** (cargo configurado no `.env`) ou o **dono do servidor** pode assumir tickets.",
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

  const embed = EmbedBuilder.from(baseEmbed).addFields({
    name: "Assumido por",
    value: `${interaction.user} (\`${interaction.user.id}\`)`,
    inline: true,
  });

  const payload = { embeds: [embed], components: [controlRow()] };
  if (interaction.message.content) payload.content = interaction.message.content;
  await interaction.update(payload);
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
      content:
        "Apenas a **equipe de suporte** (cargo no `.env`) ou o **dono do servidor** pode fechar tickets.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const baseEmbed = interaction.message?.embeds?.[0];
  if (!baseEmbed) {
    await interaction.reply({ content: "Mensagem de controle não encontrada.", flags: MessageFlags.Ephemeral });
    return true;
  }

  {
    const payload = {
      embeds: [EmbedBuilder.from(baseEmbed)],
      components: [confirmRow()],
    };
    if (interaction.message.content) payload.content = interaction.message.content;
    await interaction.update(payload);
  }
  return true;
}

export async function handleTicketCloseCancel(interaction) {
  if (interaction.customId !== "ticket_close_cancel") return false;
  const channel = interaction.channel;
  if (!channel?.isTextBased?.() || !interaction.guild || !interaction.user) {
    await interaction.reply({ content: "Ação inválida.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const meta = parseTicketTopic(channel.topic ?? "");
  if (!meta) {
    await interaction.reply({ content: "Este canal não é um ticket gerenciado pelo bot.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (!(await interactionMemberCanManageTickets(interaction))) {
    await interaction.reply({
      content: "Apenas a **equipe de suporte** ou o **dono do servidor** pode usar esta ação.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const baseEmbed = interaction.message?.embeds?.[0];
  if (!baseEmbed) {
    await interaction.reply({ content: "Embed não encontrado.", flags: MessageFlags.Ephemeral });
    return true;
  }

  {
    const payload = {
      embeds: [EmbedBuilder.from(baseEmbed)],
      components: [controlRow()],
    };
    if (interaction.message.content) payload.content = interaction.message.content;
    await interaction.update(payload);
  }
  return true;
}

export async function handleTicketCloseConfirm(interaction) {
  if (interaction.customId !== "ticket_close_confirm") return false;
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
      content: "Apenas a **equipe de suporte** ou o **dono do servidor** pode usar esta ação.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const opener = await interaction.guild.members.fetch(meta.openerId).catch(() => null);
  const typeInfo = getTicketType(meta.typeValue);
  const typeLabel = typeInfo ? `${typeInfo.label}` : meta.typeValue;
  const openedMs = channel.createdTimestamp;
  const closedMs = Date.now();
  const durationSec = Math.max(0, Math.floor((closedMs - openedMs) / 1000));
  const durationLabel =
    durationSec < 60
      ? `${durationSec}s`
      : `${Math.floor(durationSec / 60)}min (${durationSec}s)`;

  let text;
  try {
    text = await buildChannelTranscript(channel);
  } catch (err) {
    console.error("Erro ao gerar transcript:", err);
    await interaction.editReply({
      content: "Falha ao gerar o transcript. Verifique se o bot pode **Ler histórico de mensagens** neste canal.",
    });
    return true;
  }

  const buffer = Buffer.from(text, "utf8");
  const fileName = `transcript-${channel.name}-${channel.id}.txt`;
  const attachment = new AttachmentBuilder(buffer, { name: fileName });

  const logEmbed = new EmbedBuilder()
    .setColor(config.ticketPanelColor)
    .setTitle("Ticket encerrado")
    .addFields(
      { name: "Canal", value: `\`${channel.name}\` (${channel.id})`, inline: true },
      { name: "Tipo", value: typeLabel, inline: true },
      { name: "Duração", value: durationLabel, inline: true },
      {
        name: "Aberto por",
        value: opener ? `${opener.user.tag} (\`${opener.id}\`)` : `\`${meta.openerId}\``,
        inline: false,
      },
      {
        name: "Fechado por",
        value: `${interaction.user.tag} (\`${interaction.user.id}\`)`,
        inline: false,
      }
    )
    .setTimestamp();

  let logSent = false;
  if (config.logChannelId) {
    const logChannel = await interaction.guild.channels
      .fetch(config.logChannelId)
      .catch(() => null);
    if (logChannel?.isTextBased()) {
      try {
        await logChannel.send({
          embeds: [logEmbed],
          files: [attachment],
        });
        logSent = true;
      } catch (err) {
        console.error("Falha ao enviar log do ticket:", err);
      }
    }
  }

  const replyFiles = logSent ? [] : [attachment];
  const replyText = logSent
    ? "Ticket encerrado. Log e transcript enviados ao canal de registro. O canal do ticket será excluído."
    : config.logChannelId
      ? "Ticket encerrado. Não foi possível enviar ao canal de log; o transcript está anexo. O canal será excluído."
      : "Ticket encerrado (defina **LOG_CHANNEL_ID** para arquivar logs no servidor). Transcript anexo. O canal será excluído.";

  await interaction.editReply({
    content: replyText,
    files: replyFiles,
  });

  try {
    await channel.send("**Este ticket foi encerrado.** Este canal será excluído.");
  } catch {
    /* ignore */
  }

  try {
    await channel.delete("Ticket encerrado pela equipe");
  } catch (err) {
    console.error("Erro ao excluir canal do ticket:", err);
    await interaction.followUp({
      content: "Não foi possível excluir o canal automaticamente. Apague manualmente se necessário.",
      flags: MessageFlags.Ephemeral,
    });
  }

  return true;
}
