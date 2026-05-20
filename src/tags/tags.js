import { Events } from "discord.js";
import { getTag, getTagSettings, incrementTagUse } from "../db/tags.js";

async function processTag(message) {
  if (!message.guild || message.author.bot) return;
  if (!message.content) return;

  const settings = getTagSettings(message.guild.id);
  const prefix = settings.prefix ?? "!";

  if (!message.content.startsWith(prefix)) return;

  const trigger = message.content.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
  if (!trigger) return;

  const tag = getTag(message.guild.id, trigger);
  if (!tag) return;

  incrementTagUse(message.guild.id, trigger);

  // allowedMentions: { parse: [] } evita que o conteúdo da tag pingue @everyone ou cargos
  await message.reply({ content: tag.response, allowedMentions: { parse: [] } }).catch(() => null);
}

export function registerTagEvents(client) {
  client.on(Events.MessageCreate, (msg) => {
    processTag(msg).catch((err) => console.error("Tag error:", err));
  });

  console.log("Sistema de tags ativo");
}
