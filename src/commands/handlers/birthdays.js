import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getBirthday, setBirthday, removeBirthday, getBirthdaySettings, upsertBirthdaySettings } from "../../db/birthdays.js";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export async function handleBirthdaysCommand(interaction) {
  if (interaction.commandName !== "aniversario") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "registrar") {
    const dia = interaction.options.getInteger("dia");
    const mes = interaction.options.getInteger("mes");
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) {
      await interaction.editReply({ content: "❌ Data inválida." });
      return true;
    }
    setBirthday(guildId, interaction.user.id, dia, mes);
    await interaction.editReply({ content: `✅ Aniversário registrado: **${dia} de ${MONTHS[mes - 1]}**! 🎂` });
    return true;
  }

  if (sub === "remover") {
    const removed = removeBirthday(guildId, interaction.user.id);
    await interaction.editReply({ content: removed ? "✅ Seu aniversário foi removido." : "❌ Você não tinha aniversário registrado." });
    return true;
  }

  if (sub === "ver") {
    const user = interaction.options.getUser("usuario") ?? interaction.user;
    const row = getBirthday(guildId, user.id);
    if (!row) {
      await interaction.editReply({ content: `❌ ${user.id === interaction.user.id ? "Você não tem" : `**${user.username}** não tem`} aniversário registrado.` });
      return true;
    }
    await interaction.editReply({ content: `🎂 **${user.username}** faz aniversário em **${row.day} de ${MONTHS[row.month - 1]}**.` });
    return true;
  }

  if (sub === "configurar") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
      return true;
    }
    const channel = interaction.options.getChannel("canal");
    const message = interaction.options.getString("mensagem");
    if (message && !message.includes("{usuario}")) {
      await interaction.editReply({ content: "❌ A mensagem precisa conter `{usuario}`." });
      return true;
    }
    const patch = {};
    if (channel) patch.channel_id = channel.id;
    if (message) patch.message = message;
    upsertBirthdaySettings(guildId, patch);

    const settings = getBirthdaySettings(guildId);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎂 Aniversários configurado!")
          .addFields(
            { name: "Canal", value: settings?.channel_id ? `<#${settings.channel_id}>` : "Não definido", inline: true },
            { name: "Mensagem", value: settings?.message ?? "padrão", inline: false }
          ),
      ],
    });
    return true;
  }

  return false;
}
