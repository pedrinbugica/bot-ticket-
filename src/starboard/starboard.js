import { EmbedBuilder, Events } from "discord.js";
import {
  getStarboardConfig,
  getStarboardEntry,
  upsertStarboardEntry,
} from "../db/starboard.js";

function normalizeEmoji(emoji) {
  if (!emoji) return "⭐";
  return emoji.trim();
}

function reactionMatchesEmoji(reaction, configEmoji) {
  const cfg = normalizeEmoji(configEmoji);
  const name = reaction.emoji.name ?? "";
  const id = reaction.emoji.id;
  if (id) return cfg === `<:${name}:${id}>` || cfg === `<a:${name}:${id}>`;
  return name === cfg;
}

function buildStarboardEmbed(message, starCount, emoji) {
  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setAuthor({
      name: message.author.tag ?? message.author.username,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp(message.createdAt)
    .setFooter({ text: `${emoji} ${starCount} · #${message.channel.name}` });

  if (message.content) embed.setDescription(message.content.slice(0, 4000));

  const image = message.attachments.find((a) => a.contentType?.startsWith("image/"));
  if (image) embed.setImage(image.url);

  embed.addFields({ name: "Ir para mensagem", value: `[Clique aqui](${message.url})`, inline: true });

  return embed;
}

async function handleReactionChange(reaction, client) {
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  const message = reaction.message;
  if (!message.guild || message.author?.bot) return;

  const guildId = message.guild.id;
  const cfg = getStarboardConfig(guildId);
  if (!cfg?.channel_id || !cfg.enabled) return;
  if (!reactionMatchesEmoji(reaction, cfg.emoji)) return;
  if (message.channel.id === cfg.channel_id) return;

  const starCount = reaction.count ?? 0;
  const emoji = normalizeEmoji(cfg.emoji);

  const starboardChannel = message.guild.channels.cache.get(cfg.channel_id)
    ?? await message.guild.channels.fetch(cfg.channel_id).catch(() => null);
  if (!starboardChannel?.isTextBased()) return;

  const entry = getStarboardEntry(guildId, message.id);
  const embed = buildStarboardEmbed(message, starCount, emoji);
  const content = `${emoji} **${starCount}**`;

  if (entry?.starboard_message_id) {
    const existing = await starboardChannel.messages.fetch(entry.starboard_message_id).catch(() => null);
    if (existing) {
      await existing.edit({ content, embeds: [embed] }).catch(() => null);
      return;
    }
  }

  if (starCount < cfg.min_reactions) return;

  const sent = await starboardChannel.send({ content, embeds: [embed] }).catch(() => null);
  if (sent) upsertStarboardEntry(guildId, message.id, message.channel.id, sent.id);
}

export function registerStarboardEvents(client) {
  client.on(Events.MessageReactionAdd, (reaction) => handleReactionChange(reaction, client));
  client.on(Events.MessageReactionRemove, (reaction) => handleReactionChange(reaction, client));
  console.log("Starboard ativo");
}
