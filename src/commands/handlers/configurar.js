import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getWelcomeSettings, upsertWelcomeSettings } from "../../db/welcomeSettings.js";
import { getLogSettings, upsertLogSettings } from "../../db/auditLog.js";

const EVENT_MAP = {
  "mensagem-editada": "message_edit",
  "mensagem-apagada": "message_delete",
  "membro-entrou": "member_join",
  "membro-saiu": "member_leave",
  "membro-banido": "member_ban",
  "membro-desbanido": "member_unban",
  "cargo-alterado": "role_change",
  "apelido-alterado": "nickname_change",
};

const EVENT_LABELS = {
  message_edit: "Mensagem editada",
  message_delete: "Mensagem apagada",
  member_join: "Membro entrou",
  member_leave: "Membro saiu",
  member_ban: "Membro banido",
  member_unban: "Membro desbanido",
  role_change: "Cargo alterado",
  nickname_change: "Apelido alterado",
};

function hasPerm(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export async function handleConfigurarCommand(interaction) {
  if (interaction.commandName !== "configurar" || !interaction.guild) return false;

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;

  if (sub === "ver") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const welcome = getWelcomeSettings(guildId);
    const logs = getLogSettings(guildId);

    let autoRoles = [];
    try { autoRoles = JSON.parse(welcome?.auto_role_ids ?? "[]"); } catch { /* */ }

    let eventsEnabled = [];
    try { eventsEnabled = JSON.parse(logs?.events_enabled ?? "[]"); } catch { /* */ }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("⚙️ Configuração do servidor")
      .addFields(
        {
          name: "👋 Boas-vindas",
          value: welcome?.welcome_channel_id
            ? [
                `Canal: <#${welcome.welcome_channel_id}>`,
                welcome.welcome_message ? `Mensagem: ${welcome.welcome_message.slice(0, 100)}` : null,
                welcome.goodbye_channel_id ? `Canal despedida: <#${welcome.goodbye_channel_id}>` : null,
                welcome.welcome_dm ? `DM: ${welcome.welcome_dm.slice(0, 80)}` : null,
                autoRoles.length ? `Auto-cargos: ${autoRoles.map((id) => `<@&${id}>`).join(" ")}` : null,
              ].filter(Boolean).join("\n")
            : "Não configurado. Use `/configurar boas-vindas`.",
          inline: false,
        },
        {
          name: "📋 Logs",
          value: logs?.log_channel_id
            ? [
                `Canal: <#${logs.log_channel_id}>`,
                `Eventos: ${eventsEnabled.length
                  ? eventsEnabled.map((e) => EVENT_LABELS[e] ?? e).join(", ")
                  : "Nenhum ativado"}`,
              ].join("\n")
            : "Não configurado. Use `/configurar logs`.",
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!hasPerm(interaction)) {
    await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
    return true;
  }

  if (sub === "boas-vindas") {
    const canal = interaction.options.getChannel("canal");
    const mensagem = interaction.options.getString("mensagem");
    const canalDespedida = interaction.options.getChannel("canal-despedida");
    const mensagemDespedida = interaction.options.getString("mensagem-despedida");
    const dm = interaction.options.getString("dm");
    const autoCargo = interaction.options.getRole("auto-cargo");

    const patch = {};
    if (canal !== null) patch.welcome_channel_id = canal.id;
    if (mensagem !== null) patch.welcome_message = mensagem;
    if (canalDespedida !== null) patch.goodbye_channel_id = canalDespedida.id;
    if (mensagemDespedida !== null) patch.goodbye_message = mensagemDespedida;
    if (dm !== null) patch.welcome_dm = dm;

    if (autoCargo !== null) {
      const existing = getWelcomeSettings(guildId);
      let ids = [];
      try { ids = JSON.parse(existing?.auto_role_ids ?? "[]"); } catch { /* */ }
      if (!ids.includes(autoCargo.id)) ids.push(autoCargo.id);
      patch.auto_role_ids = JSON.stringify(ids);
    }

    if (!Object.keys(patch).length) {
      await interaction.editReply({ content: "ℹ️ Nenhuma opção fornecida. Passe pelo menos uma para salvar." });
      return true;
    }

    upsertWelcomeSettings(guildId, patch);
    await interaction.editReply({ content: "✅ Configurações de boas-vindas salvas com sucesso!" });
    return true;
  }

  if (sub === "logs") {
    const canal = interaction.options.getChannel("canal");

    const existing = getLogSettings(guildId);
    let eventsEnabled = [];
    try { eventsEnabled = JSON.parse(existing?.events_enabled ?? "[]"); } catch { /* */ }

    const patch = {};
    if (canal !== null) patch.log_channel_id = canal.id;

    let eventsChanged = false;
    for (const [optName, eventKey] of Object.entries(EVENT_MAP)) {
      const val = interaction.options.getBoolean(optName);
      if (val === null) continue;
      eventsChanged = true;
      if (val && !eventsEnabled.includes(eventKey)) {
        eventsEnabled.push(eventKey);
      } else if (!val) {
        eventsEnabled = eventsEnabled.filter((e) => e !== eventKey);
      }
    }

    if (eventsChanged) patch.events_enabled = JSON.stringify(eventsEnabled);

    if (!Object.keys(patch).length) {
      await interaction.editReply({ content: "ℹ️ Nenhuma opção fornecida. Passe pelo menos uma para salvar." });
      return true;
    }

    upsertLogSettings(guildId, patch);
    await interaction.editReply({ content: "✅ Configurações de logs salvas com sucesso!" });
    return true;
  }

  return false;
}
