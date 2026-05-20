import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  getLevelSettings,
  upsertLevelSettings,
  getUserLevel,
  resetUserXp,
  getLeaderboard,
  getUserRank,
  getTotalUsersInLeaderboard,
  listLevelRoles,
  addLevelRole,
  removeLevelRole,
} from "../../db/leveling.js";
import { calcLevel, xpForLevel, xpForNextLevel, makeXpBar } from "../../leveling/leveling.js";

function hasPerm(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export async function handleLevelingCommand(interaction) {
  const cmd = interaction.commandName;
  if (cmd !== "nivel" && cmd !== "top" && cmd !== "xp") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;

  // ── /nivel [usuario] ─────────────────────────────────────────
  if (cmd === "nivel") {
    const target = interaction.options.getUser("usuario") ?? interaction.user;
    const data = getUserLevel(guild.id, target.id);

    if (!data) {
      await interaction.editReply({ content: `ℹ️ ${target} ainda não tem XP neste servidor.` });
      return true;
    }

    const xp = data.xp;
    const level = calcLevel(xp);
    const prevXp = xpForLevel(level);
    const nextXp = xpForNextLevel(level);
    const bar = makeXpBar(xp);
    const rank = getUserRank(guild.id, target.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Nível", value: `**${level}**`, inline: true },
        { name: "Ranking", value: `**#${rank ?? "?"}**`, inline: true },
        { name: "XP Total", value: `**${xp.toLocaleString("pt-BR")}**`, inline: true },
        {
          name: `Progresso → nível ${level + 1}`,
          value: `${bar} ${(xp - prevXp).toLocaleString("pt-BR")} / ${(nextXp - prevXp).toLocaleString("pt-BR")} XP`,
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  // ── /top [pagina] ────────────────────────────────────────────
  if (cmd === "top") {
    const page = Math.max(1, interaction.options.getInteger("pagina") ?? 1);
    const perPage = 10;
    const offset = (page - 1) * perPage;
    const rows = getLeaderboard(guild.id, perPage, offset);
    const total = getTotalUsersInLeaderboard(guild.id);
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏆 Ranking de XP — ${guild.name}`)
      .setFooter({ text: `Página ${page}/${totalPages} · ${total} membro(s) no ranking` })
      .setTimestamp();

    if (!rows.length) {
      embed.setDescription(
        "Nenhum membro com XP ainda.\nAtive o sistema com `/xp config ativar:Sim`."
      );
    } else {
      const medals = ["🥇", "🥈", "🥉"];
      const lines = rows.map((r, i) => {
        const pos = offset + i + 1;
        const medal = pos <= 3 ? medals[pos - 1] : `**#${pos}**`;
        const level = calcLevel(r.xp);
        return `${medal} <@${r.user_id}> — Nível **${level}** · ${r.xp.toLocaleString("pt-BR")} XP`;
      });
      embed.setDescription(lines.join("\n"));
    }

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  // ── /xp subcommands ──────────────────────────────────────────
  if (cmd === "xp") {
    const sub = interaction.options.getSubcommand();

    if (sub === "reset") {
      if (!hasPerm(interaction)) {
        await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
        return true;
      }
      const target = interaction.options.getUser("usuario");
      resetUserXp(guild.id, target.id);
      await interaction.editReply({ content: `✅ XP de ${target} redefinido para zero.` });
      return true;
    }

    if (sub === "config") {
      if (!hasPerm(interaction)) {
        await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
        return true;
      }

      const ativo = interaction.options.getBoolean("ativar");
      const canal = interaction.options.getChannel("canal");
      const xpMsg = interaction.options.getInteger("xp_mensagem");
      const cooldown = interaction.options.getInteger("cooldown");

      const patch = {};
      if (ativo !== null) patch.enabled = ativo ? 1 : 0;
      if (canal !== null) patch.levelup_channel_id = canal.id;
      if (xpMsg !== null) patch.xp_per_message = xpMsg;
      if (cooldown !== null) patch.xp_cooldown_secs = cooldown;

      if (!Object.keys(patch).length) {
        const s = getLevelSettings(guild.id);
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("⚙️ Configuração de XP")
          .addFields(
            { name: "Status", value: s.enabled ? "✅ Ativo" : "❌ Inativo", inline: true },
            { name: "Canal de level-up", value: s.levelup_channel_id ? `<#${s.levelup_channel_id}>` : "Mesmo canal", inline: true },
            { name: "XP por mensagem", value: `${s.xp_per_message ?? 15} (±5 aleatório)`, inline: true },
            { name: "Cooldown", value: `${s.xp_cooldown_secs ?? 60}s entre mensagens`, inline: true }
          );
        await interaction.editReply({ embeds: [embed] });
        return true;
      }

      upsertLevelSettings(guild.id, patch);
      await interaction.editReply({ content: "✅ Configurações de XP atualizadas." });
      return true;
    }

    if (sub === "recompensa-adicionar") {
      if (!hasPerm(interaction)) {
        await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
        return true;
      }
      const level = interaction.options.getInteger("nivel");
      const role = interaction.options.getRole("cargo");
      addLevelRole(guild.id, level, role.id);
      await interaction.editReply({
        content: `✅ Cargo **${role.name}** será dado automaticamente ao atingir o nível **${level}**.`,
      });
      return true;
    }

    if (sub === "recompensa-remover") {
      if (!hasPerm(interaction)) {
        await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
        return true;
      }
      const level = interaction.options.getInteger("nivel");
      removeLevelRole(guild.id, level);
      await interaction.editReply({ content: `✅ Recompensa do nível **${level}** removida.` });
      return true;
    }

    if (sub === "recompensas") {
      const roles = listLevelRoles(guild.id);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎁 Cargos de recompensa por nível")
        .setTimestamp();

      if (!roles.length) {
        embed.setDescription("Nenhuma recompensa configurada. Use `/xp recompensa-adicionar`.");
      } else {
        embed.setDescription(
          roles.map((r) => `Nível **${r.level_required}** → <@&${r.role_id}>`).join("\n")
        );
      }

      await interaction.editReply({ embeds: [embed] });
      return true;
    }
  }

  return false;
}
