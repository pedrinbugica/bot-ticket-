import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import {
  insertPoll,
  getPoll,
  updatePollMessageId,
  endPoll,
  castVote,
  getVoteCounts,
  getTotalVotes,
} from "../db/polls.js";
import { parseDuration } from "../moderation/actions.js";

export const POLL_VOTE_PREFIX = "poll:vote:";
const BAR_LENGTH = 10;

function makeBar(votes, total) {
  if (total === 0) return `${"░".repeat(BAR_LENGTH)} 0%`;
  const pct = Math.round((votes / total) * 100);
  const filled = Math.round((votes / total) * BAR_LENGTH);
  return `${"█".repeat(filled)}${"░".repeat(BAR_LENGTH - filled)} ${pct}%`;
}

function buildPollEmbed(poll, counts, total, ended = false) {
  const options = JSON.parse(poll.options);
  const endsAtTs = Math.floor(new Date(poll.ends_at).getTime() / 1000);

  const lines = options.map((opt, i) => {
    const bar = makeBar(counts[i], total);
    const label = counts[i] === 1 ? "1 voto" : `${counts[i]} votos`;
    return `**${i + 1}. ${opt}**\n${bar} (${label})`;
  });

  lines.push(`\n**Total:** ${total === 1 ? "1 voto" : `${total} votos`}`);

  if (ended) {
    const maxVotes = Math.max(...counts);
    if (total > 0) {
      const winners = options.filter((_, i) => counts[i] === maxVotes);
      lines.push(`🏆 **Vencedor(es):** ${winners.join(", ")}`);
    }
  } else {
    lines.push(`⏰ Encerra <t:${endsAtTs}:R>`);
  }

  return new EmbedBuilder()
    .setColor(ended ? 0x57f287 : 0x5865f2)
    .setTitle(`📊 ${poll.question}`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: `Enquete #${poll.id}${ended ? " · Encerrada" : " · Clique para votar"}` })
    .setTimestamp();
}

function buildPollRows(pollId, options) {
  const rows = [];
  for (let r = 0; r < Math.ceil(options.length / 5); r++) {
    const row = new ActionRowBuilder();
    const slice = options.slice(r * 5, r * 5 + 5);
    for (let i = 0; i < slice.length; i++) {
      const idx = r * 5 + i;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${POLL_VOTE_PREFIX}${pollId}:${idx}`)
          .setLabel(slice[i].slice(0, 80))
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row);
  }
  return rows;
}

export async function createPoll({ guild, channel, question, options, durationStr, createdBy }) {
  if (options.length < 2) throw new Error("A enquete precisa de pelo menos 2 opções.");
  if (options.length > 10) throw new Error("Máximo de 10 opções por enquete.");

  let endsAt;
  if (durationStr) {
    const ms = parseDuration(durationStr);
    if (!ms) throw new Error("Duração inválida. Use: `10m`, `1h`, `2d`.");
    if (ms < 60_000) throw new Error("Duração mínima: 1 minuto.");
    if (ms > 30 * 24 * 60 * 60 * 1000) throw new Error("Duração máxima: 30 dias.");
    endsAt = new Date(Date.now() + ms).toISOString().replace("T", " ").slice(0, 19);
  } else {
    endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
  }

  const id = insertPoll({ guildId: guild.id, channelId: channel.id, question, options, endsAt, createdBy });
  const poll = getPoll(id);

  const message = await channel.send({
    embeds: [buildPollEmbed(poll, new Array(options.length).fill(0), 0)],
    components: buildPollRows(id, options),
  });
  updatePollMessageId(id, message.id);

  return id;
}

export async function finishPoll(poll, client) {
  endPoll(poll.id);

  const options = JSON.parse(poll.options);
  const counts = getVoteCounts(poll.id, options.length);
  const total = getTotalVotes(poll.id);

  const guild = client.guilds.cache.get(poll.guild_id);
  if (!guild) return;

  const channel =
    guild.channels.cache.get(poll.channel_id) ??
    (await guild.channels.fetch(poll.channel_id).catch(() => null));
  if (!channel?.isTextBased()) return;

  const embed = buildPollEmbed(poll, counts, total, true);

  if (poll.message_id) {
    const msg = await channel.messages.fetch(poll.message_id).catch(() => null);
    if (msg) await msg.edit({ embeds: [embed], components: [] }).catch(() => null);
  }

  await channel
    .send({ content: `📊 A enquete **"${poll.question}"** foi encerrada! Confira o resultado acima.` })
    .catch(() => null);
}

export async function handlePollButton(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith(POLL_VOTE_PREFIX)) return false;

  const parts = interaction.customId.slice(POLL_VOTE_PREFIX.length).split(":");
  const pollId = parseInt(parts[0], 10);
  const optionIndex = parseInt(parts[1], 10);

  const poll = getPoll(pollId);
  if (!poll || poll.status !== "active") {
    await interaction.reply({ content: "❌ Esta enquete já foi encerrada.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const options = JSON.parse(poll.options);
  if (optionIndex < 0 || optionIndex >= options.length) {
    await interaction.reply({ content: "❌ Opção inválida.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const result = castVote(pollId, interaction.user.id, optionIndex);

  if (result === "same") {
    await interaction.reply({
      content: `ℹ️ Você já votou em **${options[optionIndex]}**!`,
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  const counts = getVoteCounts(pollId, options.length);
  const total = getTotalVotes(pollId);
  const embed = buildPollEmbed(poll, counts, total);

  await interaction.update({ embeds: [embed], components: buildPollRows(pollId, options) }).catch(async () => {
    await interaction
      .reply({ content: "✅ Voto registrado!", flags: MessageFlags.Ephemeral })
      .catch(() => null);
  });

  return true;
}
