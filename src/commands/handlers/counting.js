import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getCountingChannel, setCountingChannel, removeCountingChannel } from "../../db/counting.js";

export async function handleCountingCommand(interaction) {
  if (interaction.commandName !== "counting") return false;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "❌ Você precisa da permissão **Gerenciar servidor**.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();

  if (sub === "configurar") {
    const channel = interaction.options.getChannel("canal");
    setCountingChannel(interaction.guild.id, channel.id);
    await interaction.editReply({
      content: `✅ Canal de contagem definido: ${channel}\n\n📌 **Regras:** comece em 1, sem contar duas vezes seguidas, errar reseta para 0.`,
    });
    return true;
  }

  if (sub === "ver") {
    const config = getCountingChannel(interaction.guild.id);
    if (!config) {
      await interaction.editReply({ content: "🔢 Nenhum canal de contagem configurado. Use `/counting configurar`." });
      return true;
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🔢 Counting Game")
          .addFields(
            { name: "Canal", value: `<#${config.channel_id}>`, inline: true },
            { name: "Número atual", value: String(config.current_number), inline: true },
            { name: "🏆 Recorde", value: String(config.high_score), inline: true }
          ),
      ],
    });
    return true;
  }

  if (sub === "desativar") {
    removeCountingChannel(interaction.guild.id);
    await interaction.editReply({ content: "✅ Canal de contagem removido." });
    return true;
  }

  return false;
}
