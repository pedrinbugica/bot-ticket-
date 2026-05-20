import { EmbedBuilder } from "discord.js";
import { logTicketEvent } from "../db/ticketEvents.js";
import { getGuildConfig } from "../config/guildConfig.js";

const ACTION_LABELS = {
  opened: "Ticket aberto",
  claimed: "Ticket assumido",
  close_requested: "Fechamento solicitado",
  member_added: "Membro adicionado",
  member_removed: "Membro removido",
  closed: "Ticket encerrado",
};

/** Só grava no banco — não posta embed (evita poluir o canal do painel / abrir-ticket). */
const CHANNEL_LOG_SKIP = new Set(["opened", "close_requested"]);

export async function logTicketAction(guild, { channelId, action, actor, detail }) {
  logTicketEvent({
    guildId: guild.id,
    channelId,
    action,
    actorId: actor?.id ?? null,
    detail: detail ?? null,
  });

  if (CHANNEL_LOG_SKIP.has(action)) return;

  const guildConfig = await getGuildConfig(guild.id);
  if (!guildConfig.logChannelId) return;

  const logChannel = await guild.channels.fetch(guildConfig.logChannelId).catch(() => null);
  if (!logChannel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(guildConfig.ticketPanelColor)
    .setTitle(ACTION_LABELS[action] ?? action)
    .setDescription(detail ?? null)
    .addFields(
      { name: "Canal", value: channelId ? `<#${channelId}>` : "—", inline: true },
      { name: "Por", value: actor ? `${actor} (\`${actor.id}\`)` : "—", inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch((err) => {
    console.error("Falha ao enviar log de ação:", err);
  });
}
