import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  getAutomodSettings,
  upsertAutomodSettings,
  addBadWord,
  removeBadWord,
  listBadWords,
} from "../../db/automod.js";

function hasPerm(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export async function handleAutomodCommand(interaction) {
  if (interaction.commandName !== "automod") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!hasPerm(interaction)) {
    await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
    return true;
  }

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "ver") {
    const { settings, words } = getAutomodSettings(guildId);
    const exemptRoles = JSON.parse(settings.exempt_role_ids || "[]");
    const exemptChannels = JSON.parse(settings.exempt_channel_ids || "[]");

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🛡️ Configuração de Auto-mod")
      .addFields(
        {
          name: "🔤 Filtro de palavras",
          value: settings.word_filter_enabled
            ? `✅ Ativo · Ação: \`${settings.word_filter_action}\` · ${words.length} palavra(s)`
            : "❌ Inativo",
          inline: false,
        },
        {
          name: "💬 Anti-spam",
          value: settings.spam_enabled
            ? `✅ Ativo · ${settings.spam_msg_count} msgs em ${settings.spam_window_secs}s · Ação: \`${settings.spam_action}\``
            : "❌ Inativo",
          inline: false,
        },
        {
          name: "📢 Anti-menção",
          value: settings.mention_limit > 0 ? `✅ Máx. ${settings.mention_limit} menções` : "❌ Inativo",
          inline: true,
        },
        {
          name: "🔗 Filtro de links",
          value: settings.link_filter_enabled ? "✅ Ativo" : "❌ Inativo",
          inline: true,
        },
        {
          name: "🚨 Anti-raid",
          value: settings.raid_enabled
            ? `✅ ${settings.raid_join_count} entradas em ${settings.raid_window_secs}s`
            : "❌ Inativo",
          inline: true,
        },
        {
          name: "🛑 Isenções",
          value:
            (exemptChannels.length ? `Canais: ${exemptChannels.map((id) => `<#${id}>`).join(" ")}` : "Nenhum canal") +
            "\n" +
            (exemptRoles.length ? `Cargos: ${exemptRoles.map((id) => `<@&${id}>`).join(" ")}` : "Nenhum cargo"),
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  if (sub === "palavra-adicionar") {
    const word = interaction.options.getString("palavra").trim();
    const action = interaction.options.getString("acao") ?? "delete";
    try {
      addBadWord(guildId, word, action);
      upsertAutomodSettings(guildId, { word_filter_enabled: 1 });
      await interaction.editReply({ content: `✅ Palavra \`${word.toLowerCase()}\` adicionada (ação: \`${action}\`). Filtro ativado automaticamente.` });
    } catch (err) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return true;
  }

  if (sub === "palavra-remover") {
    const word = interaction.options.getString("palavra").trim();
    removeBadWord(guildId, word);
    await interaction.editReply({ content: `✅ Palavra \`${word.toLowerCase()}\` removida da lista.` });
    return true;
  }

  if (sub === "palavras-lista") {
    const words = listBadWords(guildId);
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("🚫 Palavras proibidas").setTimestamp();
    if (!words.length) {
      embed.setDescription("Nenhuma palavra na lista. Use `/automod palavra-adicionar`.");
    } else {
      const lines = words.map((w) => `\`${w.word}\` → \`${w.severity}\``);
      embed.setDescription(lines.join("\n").slice(0, 4000));
      embed.setFooter({ text: `${words.length} palavra(s)` });
    }
    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  if (sub === "spam") {
    const ativo = interaction.options.getBoolean("ativo");
    const msgs = interaction.options.getInteger("mensagens");
    const secs = interaction.options.getInteger("segundos");
    const acao = interaction.options.getString("acao");
    const patch = { spam_enabled: ativo ? 1 : 0 };
    if (msgs !== null) patch.spam_msg_count = msgs;
    if (secs !== null) patch.spam_window_secs = secs;
    if (acao) patch.spam_action = acao;
    upsertAutomodSettings(guildId, patch);
    const details = msgs ? ` · ${msgs} msgs em ${secs}s` : "";
    const acaoStr = acao ? ` · ação: \`${acao}\`` : "";
    await interaction.editReply({ content: `✅ Anti-spam **${ativo ? "ativado" : "desativado"}**${details}${acaoStr}.` });
    return true;
  }

  if (sub === "mencoes") {
    const limit = interaction.options.getInteger("limite");
    upsertAutomodSettings(guildId, { mention_limit: limit });
    await interaction.editReply({
      content: limit === 0
        ? "✅ Anti-menção **desativado**."
        : `✅ Anti-menção ativo: máx. **${limit}** menções por mensagem.`,
    });
    return true;
  }

  if (sub === "links") {
    const ativo = interaction.options.getBoolean("ativo");
    upsertAutomodSettings(guildId, { link_filter_enabled: ativo ? 1 : 0 });
    await interaction.editReply({ content: `✅ Filtro de links **${ativo ? "ativado" : "desativado"}**.` });
    return true;
  }

  if (sub === "raid") {
    const ativo = interaction.options.getBoolean("ativo");
    const entradas = interaction.options.getInteger("entradas");
    const secs = interaction.options.getInteger("segundos");
    const patch = { raid_enabled: ativo ? 1 : 0 };
    if (entradas !== null) patch.raid_join_count = entradas;
    if (secs !== null) patch.raid_window_secs = secs;
    upsertAutomodSettings(guildId, patch);
    const details = entradas ? ` · ${entradas} entradas em ${secs}s` : "";
    await interaction.editReply({ content: `✅ Anti-raid **${ativo ? "ativado" : "desativado"}**${details}.` });
    return true;
  }

  if (sub === "isentar-canal") {
    const channel = interaction.options.getChannel("canal");
    const { settings } = getAutomodSettings(guildId);
    const ids = JSON.parse(settings.exempt_channel_ids || "[]");
    if (ids.includes(channel.id)) {
      await interaction.editReply({ content: `ℹ️ Este canal já está na lista de isenções.` });
      return true;
    }
    ids.push(channel.id);
    upsertAutomodSettings(guildId, { exempt_channel_ids: JSON.stringify(ids) });
    await interaction.editReply({ content: `✅ Canal ${channel} isento do auto-mod.` });
    return true;
  }

  if (sub === "isentar-cargo") {
    const role = interaction.options.getRole("cargo");
    const { settings } = getAutomodSettings(guildId);
    const ids = JSON.parse(settings.exempt_role_ids || "[]");
    if (ids.includes(role.id)) {
      await interaction.editReply({ content: `ℹ️ Este cargo já está na lista de isenções.` });
      return true;
    }
    ids.push(role.id);
    upsertAutomodSettings(guildId, { exempt_role_ids: JSON.stringify(ids) });
    await interaction.editReply({ content: `✅ Cargo **${role.name}** isento do auto-mod.` });
    return true;
  }

  return false;
}
