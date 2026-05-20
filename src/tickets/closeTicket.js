import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { getGuildConfig, getTicketType } from "../config/guildConfig.js";
import { deleteTicket, getTicket } from "../db/tickets.js";
import { buildChannelTranscript, buildChannelTranscriptHtml } from "./transcript.js";
import { logTicketAction } from "./logAction.js";
import { parseTicketTopic } from "./open.js";

export async function finalizeTicketClose({
  interaction,
  channel,
  closer,
  closeReason,
  notifyChannel = true,
  inactivityClose = false,
}) {
  const guild = interaction.guild;
  const meta = parseTicketTopic(channel.topic ?? "");
  if (!meta) throw new Error("Canal não é ticket");

  const guildConfig = await getGuildConfig(guild.id);
  const ticketRow = getTicket(channel.id);
  const opener = await guild.members.fetch(meta.openerId).catch(() => null);
  const typeInfo = await getTicketType(guild.id, meta.typeValue);
  const typeLabel = typeInfo ? typeInfo.label : meta.typeValue;
  const openedMs = channel.createdTimestamp;
  const durationSec = Math.max(0, Math.floor((Date.now() - openedMs) / 1000));
  const durationLabel =
    durationSec < 60
      ? `${durationSec}s`
      : `${Math.floor(durationSec / 60)}min (${durationSec}s)`;

  const text = await buildChannelTranscript(channel);
  const html = await buildChannelTranscriptHtml(channel);
  const txtAttachment = new AttachmentBuilder(Buffer.from(text, "utf8"), {
    name: `transcript-${channel.name}-${channel.id}.txt`,
  });
  const htmlAttachment = new AttachmentBuilder(Buffer.from(html, "utf8"), {
    name: `transcript-${channel.name}-${channel.id}.html`,
  });

  const logEmbed = new EmbedBuilder()
    .setColor(guildConfig.ticketPanelColor)
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
        value: `${closer.tag} (\`${closer.id}\`)`,
        inline: false,
      }
    )
    .setTimestamp();

  if (closeReason) {
    logEmbed.addFields({ name: "Motivo", value: closeReason.slice(0, 1024), inline: false });
  }
  if (ticketRow?.subject) {
    logEmbed.addFields({ name: "Assunto", value: ticketRow.subject.slice(0, 256), inline: false });
  }

  let logSent = false;
  if (guildConfig.logChannelId) {
    const logChannel = await guild.channels.fetch(guildConfig.logChannelId).catch(() => null);
    if (logChannel?.isTextBased()) {
      try {
        await logChannel.send({
          embeds: [logEmbed],
          files: [txtAttachment, htmlAttachment],
        });
        logSent = true;
      } catch (err) {
        console.error("Falha ao enviar log do ticket:", err);
      }
    }
  }

  await logTicketAction(guild, {
    channelId: channel.id,
    action: "closed",
    actor: closer,
    detail: closeReason || null,
  });

  deleteTicket(channel.id);

  if (inactivityClose && opener) {
    try {
      const files = guildConfig.sendDmOnClose ? [txtAttachment] : [];
      await opener.send({
        content: `Seu ticket em **${guild.name}** foi encerrado automaticamente por inatividade.${closeReason ? ` (${closeReason})` : ""}`,
        files,
      });
    } catch {
      /* DMs fechadas */
    }
  } else if (guildConfig.sendDmOnClose && opener) {
    try {
      await opener.send({
        content: `Seu ticket em **${guild.name}** foi encerrado.`,
        files: [txtAttachment],
      });
    } catch {
      /* DMs fechadas */
    }
  }

  if (notifyChannel) {
    try {
      await channel.send("**Este ticket foi encerrado.** Este canal será excluído.");
    } catch {
      /* ignore */
    }
  }

  try {
    await channel.delete("Ticket encerrado");
  } catch (err) {
    console.error("Erro ao excluir canal:", err);
    return {
      logSent,
      files: logSent ? [] : [txtAttachment, htmlAttachment],
      deleteFailed: true,
    };
  }

  return {
    logSent,
    files: logSent ? [] : [txtAttachment, htmlAttachment],
    deleteFailed: false,
  };
}
