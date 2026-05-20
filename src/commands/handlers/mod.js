import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  warnMember, muteMember, kickMember, banMember,
  parseDuration, formatDuration,
} from "../../moderation/actions.js";
import {
  getInfractionsByUser, getInfractionByCase,
  deactivateInfraction, getRecentCases,
} from "../../db/infractions.js";

const ACTION_ICONS = { warn: "⚠️", mute: "🔇", kick: "👢", ban: "🔨" };
const ACTION_COLORS = { warn: 0xffa500, mute: 0xff6600, kick: 0xff4400, ban: 0xff0000 };
const ACTION_LABELS = { warn: "Aviso aplicado", mute: "Membro silenciado", kick: "Membro expulso", ban: "Membro banido" };

function isHierarchyBlocked(moderator, target, guild) {
  if (!moderator.roles || !target.roles) return false;
  if (guild.ownerId === moderator.id) return false;
  return target.roles.highest.position >= moderator.roles.highest.position;
}

function validateTarget(interaction, target) {
  if (!target) return "Membro não encontrado no servidor.";
  if (target.id === interaction.user.id) return "Você não pode moderar a si mesmo.";
  if (target.id === interaction.client.user.id) return "Não posso moderar a mim mesmo.";
  if (target.id === interaction.guild.ownerId) return "Não é possível moderar o dono do servidor.";
  if (isHierarchyBlocked(interaction.member, target, interaction.guild)) {
    return "Você não pode moderar membros com cargo igual ou superior ao seu.";
  }
  return null;
}

function buildResultEmbed(action, user, caseNumber, reason, durationMs, dmSent) {
  const embed = new EmbedBuilder()
    .setColor(ACTION_COLORS[action] ?? 0x5865f2)
    .setTitle(`${ACTION_ICONS[action] ?? "⚙️"} ${ACTION_LABELS[action] ?? action}`)
    .addFields(
      { name: "Usuário", value: `${user.tag ?? user.username ?? String(user)} (\`${user.id}\`)`, inline: true },
      { name: "Caso #", value: String(caseNumber), inline: true },
      { name: "Motivo", value: reason ?? "Não informado", inline: false }
    )
    .setTimestamp();
  if (durationMs) embed.addFields({ name: "Duração", value: formatDuration(durationMs), inline: true });
  if (!dmSent && (action === "warn" || action === "mute")) {
    embed.setFooter({ text: "Não foi possível enviar DM ao usuário." });
  }
  return embed;
}

function buildHistoryEmbed(user, infractions) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Histórico — ${user.tag ?? user.username}`)
    .setThumbnail(user.displayAvatarURL?.() ?? null)
    .setTimestamp();

  if (!infractions.length) {
    return embed.setDescription("Nenhuma infração registrada.");
  }

  const lines = infractions.slice(0, 15).map((inf) => {
    const icon = ACTION_ICONS[inf.action] ?? "•";
    const date = inf.created_at.split("T")[0];
    const removed = inf.active ? "" : " ~~removido~~";
    return `**#${inf.case_number}** ${icon} ${inf.reason ?? "sem motivo"} *(${date})*${removed}`;
  });

  return embed
    .setDescription(lines.join("\n"))
    .setFooter({ text: `${infractions.length} infração(ões) total` });
}

function buildCasesEmbed(guild, cases) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Casos recentes — ${guild.name}`)
    .setTimestamp();

  if (!cases.length) return embed.setDescription("Nenhum caso registrado.");

  const lines = cases.map((inf) => {
    const icon = ACTION_ICONS[inf.action] ?? "•";
    const date = inf.created_at.split("T")[0];
    return `**#${inf.case_number}** ${icon} <@${inf.user_id}> por <@${inf.mod_id}> *(${date})* — ${inf.reason ?? "sem motivo"}`;
  });

  return embed.setDescription(lines.join("\n"));
}

export async function handleModCommand(interaction) {
  if (interaction.commandName !== "mod") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;
  const moderator = interaction.member;

  if (sub === "warn") {
    if (!moderator.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ content: "❌ Você precisa da permissão **Moderar membros**." }), true;
    }
    const target = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("motivo");
    const err = validateTarget(interaction, target);
    if (err) return interaction.editReply({ content: `❌ ${err}` }), true;

    const { caseNumber, dmSent } = await warnMember({ guild, target, moderator, reason });
    await interaction.editReply({ embeds: [buildResultEmbed("warn", target.user, caseNumber, reason, null, dmSent)] });
    return true;
  }

  if (sub === "mute") {
    if (!moderator.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ content: "❌ Você precisa da permissão **Moderar membros**." }), true;
    }
    const target = interaction.options.getMember("usuario");
    const durationStr = interaction.options.getString("duracao");
    const reason = interaction.options.getString("motivo");

    const err = validateTarget(interaction, target);
    if (err) return interaction.editReply({ content: `❌ ${err}` }), true;

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs <= 0) {
      return interaction.editReply({ content: "❌ Duração inválida. Use `10m`, `1h`, `2d` (máximo `28d`)." }), true;
    }
    if (!target.moderatable) {
      return interaction.editReply({ content: "❌ Não tenho permissão para silenciar este membro (hierarquia)." }), true;
    }

    const { caseNumber, dmSent } = await muteMember({ guild, target, moderator, reason, durationMs });
    await interaction.editReply({ embeds: [buildResultEmbed("mute", target.user, caseNumber, reason, durationMs, dmSent)] });
    return true;
  }

  if (sub === "kick") {
    if (!moderator.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.editReply({ content: "❌ Você precisa da permissão **Expulsar membros**." }), true;
    }
    const target = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("motivo");

    const err = validateTarget(interaction, target);
    if (err) return interaction.editReply({ content: `❌ ${err}` }), true;
    if (!target.kickable) {
      return interaction.editReply({ content: "❌ Não tenho permissão para expulsar este membro (hierarquia)." }), true;
    }

    const { caseNumber } = await kickMember({ guild, target, moderator, reason });
    await interaction.editReply({ embeds: [buildResultEmbed("kick", target.user, caseNumber, reason, null, false)] });
    return true;
  }

  if (sub === "ban") {
    if (!moderator.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.editReply({ content: "❌ Você precisa da permissão **Banir membros**." }), true;
    }
    const userOption = interaction.options.getUser("usuario");
    const memberOption = interaction.options.getMember("usuario");
    const reason = interaction.options.getString("motivo");
    const deleteDays = interaction.options.getInteger("apagar_mensagens") ?? 0;

    if (!userOption) return interaction.editReply({ content: "❌ Usuário não encontrado." }), true;

    if (memberOption) {
      const err = validateTarget(interaction, memberOption);
      if (err) return interaction.editReply({ content: `❌ ${err}` }), true;
      if (!memberOption.bannable) {
        return interaction.editReply({ content: "❌ Não tenho permissão para banir este membro (hierarquia)." }), true;
      }
    }

    const target = memberOption ?? userOption;
    const { caseNumber } = await banMember({ guild, target, moderator, reason, deleteMessageDays: deleteDays });
    await interaction.editReply({ embeds: [buildResultEmbed("ban", userOption, caseNumber, reason, null, false)] });
    return true;
  }

  if (sub === "historico") {
    if (!moderator.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ content: "❌ Você precisa da permissão **Moderar membros**." }), true;
    }
    const user = interaction.options.getUser("usuario");
    const infractions = getInfractionsByUser(guild.id, user.id);
    await interaction.editReply({ embeds: [buildHistoryEmbed(user, infractions)] });
    return true;
  }

  if (sub === "casos") {
    if (!moderator.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ content: "❌ Você precisa da permissão **Moderar membros**." }), true;
    }
    const cases = getRecentCases(guild.id, 10);
    await interaction.editReply({ embeds: [buildCasesEmbed(guild, cases)] });
    return true;
  }

  if (sub === "remover") {
    if (!moderator.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.editReply({ content: "❌ Você precisa da permissão **Moderar membros**." }), true;
    }
    const caseNum = interaction.options.getInteger("caso");
    const inf = getInfractionByCase(guild.id, caseNum);
    if (!inf) return interaction.editReply({ content: `❌ Caso #${caseNum} não encontrado neste servidor.` }), true;
    deactivateInfraction(inf.id);
    await interaction.editReply({ content: `✅ Caso **#${caseNum}** marcado como removido.` });
    return true;
  }

  return false;
}
