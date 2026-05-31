import { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  listStatsChannels,
  upsertStatsChannel,
  removeStatsChannel,
  STAT_TYPES,
} from "../../db/stats.js";
import { getDefaultFormat, updateStatsForGuild } from "../../stats/stats.js";

const TYPE_LABELS = {
  membros: "👥 Membros totais",
  humanos: "🧑 Membros humanos",
  bots: "🤖 Bots",
  canais: "📢 Canais",
  cargos: "🏷️ Cargos",
};

export async function handleStatsCommand(interaction) {
  if (interaction.commandName !== "stats") return false;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "❌ Você precisa da permissão **Gerenciar servidor**.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "criar") {
    const statType = interaction.options.getString("tipo");
    const channel = interaction.options.getChannel("canal");
    const customFormat = interaction.options.getString("formato");
    const format = customFormat ?? getDefaultFormat(statType);

    if (!STAT_TYPES.includes(statType)) {
      await interaction.editReply({ content: `❌ Tipo inválido. Opções: ${STAT_TYPES.join(", ")}` });
      return true;
    }

    if (!format.includes("{value}")) {
      await interaction.editReply({ content: '❌ O formato precisa conter `{value}` — é onde o número aparece. Exemplo: `👥 Membros: {value}`' });
      return true;
    }

    upsertStatsChannel(guildId, statType, channel.id, format);
    await updateStatsForGuild(interaction.guild).catch(() => null);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📊 Canal de estatísticas criado!")
          .addFields(
            { name: "Tipo", value: TYPE_LABELS[statType] ?? statType, inline: true },
            { name: "Canal", value: `${channel}`, inline: true },
            { name: "Formato", value: `\`${format}\``, inline: false }
          )
          .setDescription("O canal será atualizado automaticamente a cada 10 minutos.")
          .setFooter({ text: "Dica: use um canal de voz — membros não conseguem digitar nele" }),
      ],
    });
    return true;
  }

  if (sub === "remover") {
    const statType = interaction.options.getString("tipo");
    const deleted = removeStatsChannel(guildId, statType);
    if (!deleted) {
      await interaction.editReply({ content: `❌ Nenhum canal de estatísticas do tipo **${statType}** encontrado.` });
      return true;
    }
    await interaction.editReply({ content: `✅ Canal de estatísticas **${TYPE_LABELS[statType] ?? statType}** removido.` });
    return true;
  }

  if (sub === "lista") {
    const rows = listStatsChannels(guildId);
    if (!rows.length) {
      await interaction.editReply({ content: "📊 Nenhum canal de estatísticas configurado. Use `/stats criar`." });
      return true;
    }

    const lines = rows.map((r) => `${TYPE_LABELS[r.stat_type] ?? r.stat_type} → <#${r.channel_id}> \`${r.format}\``);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📊 Canais de estatísticas")
          .setDescription(lines.join("\n")),
      ],
    });
    return true;
  }

  if (sub === "atualizar") {
    await updateStatsForGuild(interaction.guild).catch(() => null);
    await interaction.editReply({ content: "📊 Canais de estatísticas atualizados!" });
    return true;
  }

  return false;
}
