import { ChannelType, Events, PermissionFlagsBits } from "discord.js";
import { getJtcConfig, registerJtcChannel, removeJtcChannel, isJtcChannel } from "../db/jtc.js";

async function handleVoiceState(oldState, newState) {
  const guild = newState.guild ?? oldState.guild;

  // Joined a channel
  if (newState.channelId) {
    const config = getJtcConfig(guild.id);
    if (config && newState.channelId === config.trigger_channel_id) {
      const member = newState.member;
      const name = config.name_template.replace("{username}", member.displayName).slice(0, 100);
      const created = await guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        parent: config.category_id ?? newState.channel?.parentId ?? null,
        permissionOverwrites: [
          { id: member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] },
          { id: guild.roles.everyone.id, allow: [PermissionFlagsBits.Connect] },
        ],
      }).catch(() => null);
      if (!created) return;
      await member.voice.setChannel(created).catch(() => null);
      registerJtcChannel(guild.id, created.id, member.id);
    }
  }

  // Left a channel — delete if empty JTC channel
  if (oldState.channelId && oldState.channelId !== newState.channelId) {
    const ch = oldState.channel;
    if (ch && isJtcChannel(ch.id) && ch.members.size === 0) {
      await ch.delete("JTC — canal vazio").catch(() => null);
      removeJtcChannel(ch.id);
    }
  }
}

export function registerJtcEvents(client) {
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    handleVoiceState(oldState, newState).catch((err) => console.error("jtc error:", err));
  });
  console.log("Join-to-Create ativo");
}
