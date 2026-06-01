import { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  listStatsChannels,
  upsertStatsChannel,
  removeStatsChannel,
  STAT_TYPES,
} from "../../db/stats.js";
import { getDefaultFormat, updateStatsForGuild } from "../../stats/stats.js";

const TYPE_LABELS = {
  membros:       "👥 Membros totais",
  humanos:       "🧑 Membros humanos",
  bots:          "🤖 Bots",
  canais:        "📢 Canais",
  cargos:        "🏷️ Cargos",
  boosts:        "🚀 Boosts do servidor",
  "nivel-boost": "💎 Nível de Boost",
  emojis:        "😄 Emojis",
  tickets:       "🎫 Tickets abertos",
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
    const categoria = interaction.options.getChannel("categoria");
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

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply({ content: "❌ Preciso da permissão **Gerenciar canais** para criar o canal de estatísticas." });
      return true;
    }

    const placeholderName = format.replace("{value}", "...").slice(0, 100);
    const channel = await interaction.guild.channels.create({
      name: placeholderName,
      type: ChannelType.GuildVoice,
      parent: categoria?.id ?? null,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
        },
      ],
    });

    upsertStatsChannel(guildId, statType, channel.id, format);
    await updateStatsForGuild(interaction.guild).catch(() => null);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("📊 Canal de estatísticas criado!")
          .addFields(
            { name: "Tipo", value: TYPE_LABELS[statType] ?? statType, inline: true },
            { name: "Canal criado", value: `${channel}`, inline: true },
            { name: "Formato", value: `\`${format}\``, inline: false }
          )
          .setDescription("O canal foi criado e já está com o valor atual. Atualiza automaticamente a cada 10 minutos.")
          .setFooter({ text: "Membros não conseguem entrar no canal — só serve como placar visual" }),
      ],
    });
    return true;
  }

  if (sub === "remover") {
    const statType = interaction.options.getString("tipo");
    const rows = listStatsChannels(guildId);
    const row = rows.find((r) => r.stat_type === statType);

    if (!row) {
      await interaction.editReply({ content: `❌ Nenhum canal de estatísticas do tipo **${TYPE_LABELS[statType] ?? statType}** encontrado.` });
      return true;
    }

    removeStatsChannel(guildId, statType);

    const channel = interaction.guild.channels.cache.get(row.channel_id)
      ?? await interaction.guild.channels.fetch(row.channel_id).catch(() => null);
    if (channel) await channel.delete().catch(() => null);

    await interaction.editReply({ content: `✅ Canal de estatísticas **${TYPE_LABELS[statType] ?? statType}** removido e canal apagado.` });
    return true;
  }

  if (sub === "lista") {
    const rows = listStatsChannels(guildId);
    if (!rows.length) {
      await interaction.editReply({ content: "📊 Nenhum canal de estatísticas configurado. Use `/stats criar`." });
      return true;
    }

    const lines = rows.map((r) => `${TYPE_LABELS[r.stat_type] ?? r.stat_type} → <#${r.channel_id}>`);

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
