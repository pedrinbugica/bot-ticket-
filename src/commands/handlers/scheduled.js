import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { insertScheduledMessage, listScheduledMessages, cancelScheduledMessage } from "../../db/scheduled.js";

function parseBrDateTime(str) {
  const m = str.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, d, mo, y, h, min] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(min));
  return isNaN(date.getTime()) ? null : date;
}

export async function handleScheduledCommand(interaction) {
  if (interaction.commandName !== "agendar") return false;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "❌ Você precisa da permissão **Gerenciar mensagens**.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "criar") {
    const channel = interaction.options.getChannel("canal");
    const content = interaction.options.getString("mensagem");
    const whenStr = interaction.options.getString("quando");

    const date = parseBrDateTime(whenStr);
    if (!date) {
      await interaction.editReply({ content: "❌ Formato inválido. Use `DD/MM/AAAA HH:MM` — ex: `01/06/2026 20:00`" });
      return true;
    }
    if (date <= new Date()) {
      await interaction.editReply({ content: "❌ A data precisa ser no futuro." });
      return true;
    }

    const sendAt = date.toISOString().replace("T", " ").slice(0, 19);
    const id = insertScheduledMessage({ guildId, channelId: channel.id, content, sendAt, createdBy: interaction.user.id });

    await interaction.editReply({ content: `✅ Mensagem agendada! ID **#${id}**\n📅 Será enviada em ${channel} às \`${whenStr}\`` });
    return true;
  }

  if (sub === "lista") {
    const msgs = listScheduledMessages(guildId);
    if (!msgs.length) {
      await interaction.editReply({ content: "📅 Nenhuma mensagem agendada." });
      return true;
    }
    const lines = msgs.map((m) => {
      const preview = m.content.length > 60 ? m.content.slice(0, 60) + "…" : m.content;
      return `**#${m.id}** — <#${m.channel_id}> — \`${m.send_at.slice(0, 16)}\`\n> ${preview}`;
    });
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📅 Mensagens agendadas")
          .setDescription(lines.join("\n\n").slice(0, 4096)),
      ],
    });
    return true;
  }

  if (sub === "cancelar") {
    const id = interaction.options.getInteger("id");
    const removed = cancelScheduledMessage(guildId, id);
    await interaction.editReply({ content: removed ? `✅ Mensagem **#${id}** cancelada.` : `❌ Mensagem **#${id}** não encontrada ou já foi enviada.` });
    return true;
  }

  return false;
}
