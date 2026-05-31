import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getStarboardConfig, upsertStarboardConfig, disableStarboard } from "../../db/starboard.js";

export async function handleStarboardCommand(interaction) {
  if (interaction.commandName !== "starboard") return false;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "❌ Você precisa da permissão **Gerenciar servidor**.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "configurar") {
    const channel = interaction.options.getChannel("canal");
    const emoji = interaction.options.getString("emoji") ?? "⭐";
    const min = interaction.options.getInteger("minimo") ?? 3;

    upsertStarboardConfig(guildId, { channelId: channel.id, emoji, minReactions: min });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("⭐ Starboard configurado!")
          .addFields(
            { name: "Canal", value: `${channel}`, inline: true },
            { name: "Emoji", value: emoji, inline: true },
            { name: "Mínimo de reações", value: String(min), inline: true }
          )
          .setDescription("Mensagens que atingirem o mínimo de reações serão exibidas no canal do starboard.")
          .setFooter({ text: "Para desativar use /starboard desativar" }),
      ],
    });
    return true;
  }

  if (sub === "ver") {
    const cfg = getStarboardConfig(guildId);
    if (!cfg?.channel_id) {
      await interaction.editReply({ content: "⭐ Starboard não configurado neste servidor. Use `/starboard configurar`." });
      return true;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(cfg.enabled ? 0xfee75c : 0x99aab5)
          .setTitle("⭐ Configuração do Starboard")
          .addFields(
            { name: "Status", value: cfg.enabled ? "✅ Ativo" : "❌ Desativado", inline: true },
            { name: "Canal", value: `<#${cfg.channel_id}>`, inline: true },
            { name: "Emoji", value: cfg.emoji, inline: true },
            { name: "Mínimo de reações", value: String(cfg.min_reactions), inline: true }
          ),
      ],
    });
    return true;
  }

  if (sub === "desativar") {
    disableStarboard(guildId);
    await interaction.editReply({ content: "⭐ Starboard desativado. Use `/starboard configurar` para reativar." });
    return true;
  }

  return false;
}
