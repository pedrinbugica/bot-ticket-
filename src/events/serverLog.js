import { EmbedBuilder, Events } from "discord.js";
import { getLogSettings, isEventEnabled } from "../db/auditLog.js";

async function getLogChannel(client, guildId) {
  const row = getLogSettings(guildId);
  if (!row?.log_channel_id) return null;
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;
    return (
      guild.channels.cache.get(row.log_channel_id) ??
      (await guild.channels.fetch(row.log_channel_id).catch(() => null))
    );
  } catch {
    return null;
  }
}

async function sendLog(client, guildId, eventType, { color, title, description, fields, thumbnail }) {
  if (!isEventEnabled(guildId, eventType)) return;
  const channel = await getLogChannel(client, guildId);
  if (!channel?.isTextBased?.()) return;

  const embed = new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();
  if (description) embed.setDescription(description);
  if (fields?.length) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);

  await channel.send({ embeds: [embed] }).catch(() => null);
}

export function registerServerLogEvents(client) {
  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!newMsg.guild || newMsg.author?.bot) return;
    if (!oldMsg.content || oldMsg.content === newMsg.content) return;

    await sendLog(client, newMsg.guild.id, "message_edit", {
      color: 0xffd700,
      title: "✏️ Mensagem editada",
      fields: [
        { name: "Autor", value: `${newMsg.author} (\`${newMsg.author.id}\`)`, inline: true },
        { name: "Canal", value: `${newMsg.channel}`, inline: true },
        { name: "Antes", value: oldMsg.content.slice(0, 1000) || "_(sem texto)_", inline: false },
        { name: "Depois", value: newMsg.content.slice(0, 1000) || "_(sem texto)_", inline: false },
      ],
      thumbnail: newMsg.author.displayAvatarURL?.(),
    });
  });

  client.on(Events.MessageDelete, async (msg) => {
    if (!msg.guild || msg.author?.bot) return;

    await sendLog(client, msg.guild.id, "message_delete", {
      color: 0xff4444,
      title: "🗑️ Mensagem apagada",
      fields: [
        {
          name: "Autor",
          value: msg.author ? `${msg.author} (\`${msg.author.id}\`)` : "Desconhecido",
          inline: true,
        },
        { name: "Canal", value: `${msg.channel}`, inline: true },
        {
          name: "Conteúdo",
          value: msg.content?.slice(0, 1000) || "_(não armazenado no cache)_",
          inline: false,
        },
      ],
      thumbnail: msg.author?.displayAvatarURL?.(),
    });
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    const createdAt = Math.floor(member.user.createdTimestamp / 1000);
    await sendLog(client, member.guild.id, "member_join", {
      color: 0x57f287,
      title: "📥 Membro entrou",
      fields: [
        { name: "Usuário", value: `${member.user} (\`${member.id}\`)`, inline: true },
        { name: "Conta criada", value: `<t:${createdAt}:R>`, inline: true },
      ],
      thumbnail: member.user.displayAvatarURL?.(),
    });
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    await sendLog(client, member.guild.id, "member_leave", {
      color: 0x99aab5,
      title: "📤 Membro saiu",
      fields: [
        { name: "Usuário", value: `${member.user} (\`${member.id}\`)`, inline: true },
        { name: "Apelido", value: member.nickname ?? "—", inline: true },
        {
          name: "Cargos",
          value: member.roles.cache
            .filter((r) => r.id !== member.guild.id)
            .map((r) => `<@&${r.id}>`)
            .join(", ") || "—",
          inline: false,
        },
      ],
      thumbnail: member.user.displayAvatarURL?.(),
    });
  });

  client.on(Events.GuildBanAdd, async (ban) => {
    await sendLog(client, ban.guild.id, "member_ban", {
      color: 0xed4245,
      title: "🔨 Membro banido",
      fields: [
        { name: "Usuário", value: `${ban.user} (\`${ban.user.id}\`)`, inline: true },
        { name: "Motivo", value: ban.reason ?? "Não informado", inline: false },
      ],
      thumbnail: ban.user.displayAvatarURL?.(),
    });
  });

  client.on(Events.GuildBanRemove, async (ban) => {
    await sendLog(client, ban.guild.id, "member_unban", {
      color: 0x57f287,
      title: "✅ Ban removido",
      fields: [{ name: "Usuário", value: `${ban.user} (\`${ban.user.id}\`)`, inline: true }],
      thumbnail: ban.user.displayAvatarURL?.(),
    });
  });

  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const guildId = newMember.guild.id;

    if (oldMember.nickname !== newMember.nickname) {
      await sendLog(client, guildId, "nickname_change", {
        color: 0x9b59b6,
        title: "📝 Apelido alterado",
        fields: [
          { name: "Usuário", value: `${newMember.user} (\`${newMember.id}\`)`, inline: true },
          { name: "Antes", value: oldMember.nickname ?? "_(nenhum)_", inline: true },
          { name: "Depois", value: newMember.nickname ?? "_(removido)_", inline: true },
        ],
        thumbnail: newMember.user.displayAvatarURL?.(),
      });
    }

    const added = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

    if (added.size > 0) {
      await sendLog(client, guildId, "role_change", {
        color: 0x3498db,
        title: "➕ Cargo adicionado",
        fields: [
          { name: "Usuário", value: `${newMember.user} (\`${newMember.id}\`)`, inline: true },
          { name: "Cargo(s)", value: added.map((r) => `<@&${r.id}>`).join(", "), inline: true },
        ],
        thumbnail: newMember.user.displayAvatarURL?.(),
      });
    }

    if (removed.size > 0) {
      await sendLog(client, guildId, "role_change", {
        color: 0xe67e22,
        title: "➖ Cargo removido",
        fields: [
          { name: "Usuário", value: `${newMember.user} (\`${newMember.id}\`)`, inline: true },
          { name: "Cargo(s)", value: removed.map((r) => `<@&${r.id}>`).join(", "), inline: true },
        ],
        thumbnail: newMember.user.displayAvatarURL?.(),
      });
    }
  });

  console.log("Logs do servidor ativos (8 eventos monitorados)");
}
