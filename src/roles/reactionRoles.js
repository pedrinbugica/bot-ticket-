import { Events } from "discord.js";
import { getReactionRoleByEmoji } from "../db/roles.js";

function resolveEmoji(emoji) {
  return emoji.id ?? emoji.name;
}

export function registerReactionRoleEvents(client) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch {
      return;
    }
    if (!reaction.message.guild) return;

    const emoji = resolveEmoji(reaction.emoji);
    const rr = getReactionRoleByEmoji(reaction.message.guild.id, reaction.message.id, emoji);
    if (!rr) return;

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.add(rr.role_id).catch(() => null);
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch {
      return;
    }
    if (!reaction.message.guild) return;

    const emoji = resolveEmoji(reaction.emoji);
    const rr = getReactionRoleByEmoji(reaction.message.guild.id, reaction.message.id, emoji);
    if (!rr) return;

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (member) await member.roles.remove(rr.role_id).catch(() => null);
  });

  console.log("Reaction roles ativos");
}
