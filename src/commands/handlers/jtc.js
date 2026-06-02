import { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getJtcConfig, upsertJtcConfig, removeJtcConfig } from "../../db/jtc.js";

export async function handleJtcCommand(interaction) {
  if (interaction.commandName !== "jtc") return false;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "❌ Você precisa da permissão **Gerenciar servidor**.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "configurar") {
    const trigger = interaction.options.getChannel("canal");
    const category = interaction.options.getChannel("categoria");
    const template = interaction.options.getString("nome") ?? "🎮 {username}";

    if (!template.includes("{username}")) {
      await interaction.editReply({ content: "❌ O nome precisa conter `{username}` — é onde o nome do membro aparece." });
      return true;
    }

    upsertJtcConfig(guildId, trigger.id, category?.id ?? null, template);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎮 Join-to-Create configurado!")
          .addFields(
            { name: "Canal gatilho", value: `${trigger}`, inline: true },
            { name: "Categoria", value: category ? `${category}` : "Mesma do gatilho", inline: true },
            { name: "Nome do canal", value: `\`${template}\``, inline: false }
          )
          .setDescription("Quando um membro entrar no canal gatilho, um canal de voz temporário será criado só para ele."),
      ],
    });
    return true;
  }

  if (sub === "ver") {
    const config = getJtcConfig(guildId);
    if (!config) {
      await interaction.editReply({ content: "🎮 Join-to-Create não configurado. Use `/jtc configurar`." });
      return true;
    }
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎮 Join-to-Create")
          .addFields(
            { name: "Canal gatilho", value: `<#${config.trigger_channel_id}>`, inline: true },
            { name: "Categoria", value: config.category_id ? `<#${config.category_id}>` : "Mesma do gatilho", inline: true },
            { name: "Nome do canal", value: `\`${config.name_template}\``, inline: false }
          ),
      ],
    });
    return true;
  }

  if (sub === "desativar") {
    removeJtcConfig(guildId);
    await interaction.editReply({ content: "✅ Join-to-Create desativado." });
    return true;
  }

  return false;
}
