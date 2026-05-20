import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import {
  insertGiveaway,
  getGiveaway,
  updateGiveawayMessageId,
  endGiveaway,
  addEntry,
  getEntryCount,
  getRandomWinners,
} from "../db/giveaway.js";
import { parseDuration } from "../moderation/actions.js";

export const GIVEAWAY_ENTER_PREFIX = "giveaway:enter:";

function buildGiveawayEmbed(giveaway, entryCount, ended = false, winners = []) {
  const endsAtTs = Math.floor(new Date(giveaway.ends_at).getTime() / 1000);

  const embed = new EmbedBuilder()
    .setColor(ended ? 0x57f287 : 0x5865f2)
    .setTitle(`🎉 ${giveaway.prize}`)
    .setTimestamp();

  if (ended) {
    embed
      .setDescription(
        winners.length
          ? `**Vencedor(es):** ${winners.map((id) => `<@${id}>`).join(", ")}\n**Participantes:** ${entryCount}`
          : `Nenhum participante. Sorteio encerrado sem vencedores.\n**Participantes:** ${entryCount}`
      )
      .setFooter({ text: `Sorteio #${giveaway.id} · Encerrado` });
  } else {
    embed
      .setDescription(
        `Clique em **🎉 Participar** para entrar!\n\n` +
          `**Encerra:** <t:${endsAtTs}:R>\n` +
          `**Vencedores:** ${giveaway.winner_count}\n` +
          `**Participantes:** ${entryCount}`
      )
      .setFooter({ text: `Sorteio #${giveaway.id}` });
  }

  return embed;
}

function buildGiveawayRow(giveawayId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${GIVEAWAY_ENTER_PREFIX}${giveawayId}`)
        .setLabel("Participar")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Primary)
    ),
  ];
}

export async function createGiveaway({ guild, channel, prize, durationStr, winnerCount, createdBy }) {
  const durationMs = parseDuration(durationStr);
  if (!durationMs) throw new Error("Duração inválida. Use formatos como `10m`, `1h`, `2d`.");
  if (durationMs < 60_000) throw new Error("Duração mínima: 1 minuto.");
  if (durationMs > 30 * 24 * 60 * 60 * 1000) throw new Error("Duração máxima: 30 dias.");

  const endsAt = new Date(Date.now() + durationMs).toISOString().replace("T", " ").slice(0, 19);
  const id = insertGiveaway({ guildId: guild.id, channelId: channel.id, prize, winnerCount, endsAt, createdBy });

  const giveaway = getGiveaway(id);
  const message = await channel.send({
    embeds: [buildGiveawayEmbed(giveaway, 0)],
    components: buildGiveawayRow(id),
  });
  updateGiveawayMessageId(id, message.id);

  return id;
}

export async function finishGiveaway(giveaway, client) {
  endGiveaway(giveaway.id);

  const entryCount = getEntryCount(giveaway.id);
  const winners = getRandomWinners(giveaway.id, giveaway.winner_count).map((r) => r.user_id);

  const guild = client.guilds.cache.get(giveaway.guild_id);
  if (!guild) return;

  const channel =
    guild.channels.cache.get(giveaway.channel_id) ??
    (await guild.channels.fetch(giveaway.channel_id).catch(() => null));
  if (!channel?.isTextBased()) return;

  const embed = buildGiveawayEmbed(giveaway, entryCount, true, winners);

  if (giveaway.message_id) {
    const msg = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    if (msg) await msg.edit({ embeds: [embed], components: [] }).catch(() => null);
  }

  if (winners.length) {
    await channel.send({
      content: `🎉 Parabéns ${winners.map((id) => `<@${id}>`).join(", ")}! Vocês ganharam **${giveaway.prize}**!`,
    }).catch(() => null);
  } else {
    await channel
      .send({ content: `😕 O sorteio **${giveaway.prize}** encerrou sem participantes.` })
      .catch(() => null);
  }
}

export async function rerollGiveaway(giveaway, winnerCount, client) {
  const winners = getRandomWinners(giveaway.id, winnerCount).map((r) => r.user_id);

  const guild = client.guilds.cache.get(giveaway.guild_id);
  if (guild && winners.length) {
    const channel =
      guild.channels.cache.get(giveaway.channel_id) ??
      (await guild.channels.fetch(giveaway.channel_id).catch(() => null));
    if (channel?.isTextBased()) {
      await channel
        .send({
          content: `🔄 **Reroll!** Novo(s) vencedor(es): ${winners.map((id) => `<@${id}>`).join(", ")} — **${giveaway.prize}**!`,
        })
        .catch(() => null);
    }
  }

  return winners;
}

export async function handleGiveawayButton(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith(GIVEAWAY_ENTER_PREFIX)) return false;

  const giveawayId = parseInt(interaction.customId.slice(GIVEAWAY_ENTER_PREFIX.length), 10);
  const giveaway = getGiveaway(giveawayId);

  if (!giveaway || giveaway.status !== "active") {
    await interaction.reply({ content: "❌ Este sorteio já encerrou.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const entered = addEntry(giveawayId, interaction.user.id);
  if (!entered) {
    await interaction.reply({
      content: "ℹ️ Você já está participando deste sorteio!",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const entryCount = getEntryCount(giveawayId);
  const embed = buildGiveawayEmbed(giveaway, entryCount);

  await interaction.update({ embeds: [embed], components: buildGiveawayRow(giveawayId) }).catch(async () => {
    await interaction
      .reply({ content: "✅ Você entrou no sorteio!", flags: MessageFlags.Ephemeral })
      .catch(() => null);
  });

  return true;
}
