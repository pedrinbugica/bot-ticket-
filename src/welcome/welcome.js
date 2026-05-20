import { EmbedBuilder, Events } from "discord.js";
import { getWelcomeSettings } from "../db/welcomeSettings.js";

const DEFAULT_WELCOME = "Bem-vindo(a) {usuario} ao **{servidor}**! 🎉 Você é nosso membro número **{membros}**.";
const DEFAULT_GOODBYE = "**{tag}** saiu do servidor. Agora somos **{membros}** membros.";

function applyVars(template, { user, guild }) {
  return String(template)
    .replace(/\{usuario\}/g, `${user}`)
    .replace(/\{tag\}/g, user.tag ?? user.username)
    .replace(/\{servidor\}/g, guild.name)
    .replace(/\{membros\}/g, String(guild.memberCount));
}

export function registerWelcomeEvents(client) {
  client.on(Events.GuildMemberAdd, async (member) => {
    const settings = getWelcomeSettings(member.guild.id);
    if (!settings) return;

    const vars = { user: member.user, guild: member.guild };

    // Auto-cargo ao entrar
    if (settings.auto_role_ids) {
      let roleIds = [];
      try { roleIds = JSON.parse(settings.auto_role_ids); } catch { /* */ }
      for (const roleId of roleIds) {
        await member.roles.add(roleId).catch(() => null);
      }
    }

    // Mensagem no canal de boas-vindas
    if (settings.welcome_channel_id) {
      const channel =
        member.guild.channels.cache.get(settings.welcome_channel_id) ??
        (await member.guild.channels.fetch(settings.welcome_channel_id).catch(() => null));

      if (channel?.isTextBased()) {
        const text = applyVars(settings.welcome_message || DEFAULT_WELCOME, vars);
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setDescription(text)
          .setThumbnail(member.user.displayAvatarURL())
          .setFooter({ text: member.guild.name })
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => null);
      }
    }

    // DM de boas-vindas
    if (settings.welcome_dm) {
      const dmText = applyVars(settings.welcome_dm, vars);
      await member.user.send({ content: dmText }).catch(() => null);
    }
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    const settings = getWelcomeSettings(member.guild.id);
    if (!settings?.goodbye_channel_id) return;

    const channel =
      member.guild.channels.cache.get(settings.goodbye_channel_id) ??
      (await member.guild.channels.fetch(settings.goodbye_channel_id).catch(() => null));
    if (!channel?.isTextBased()) return;

    const vars = { user: member.user, guild: member.guild };
    const text = applyVars(settings.goodbye_message || DEFAULT_GOODBYE, vars);
    await channel.send({ content: text }).catch(() => null);
  });

  console.log("Sistema de boas-vindas ativo");
}
