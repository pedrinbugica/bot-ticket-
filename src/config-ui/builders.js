import { EmbedBuilder } from "discord.js";
import { isGuildConfigured } from "../config/guildConfig.js";
import { listTicketTypes } from "../db/ticketTypes.js";

function check(ok) {
  return ok ? "✅" : "❌";
}

function hexColor(n) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

export function buildHomeEmbed(guild, cfg) {
  const typesCount = listTicketTypes(guild.id).length;
  const ready = isGuildConfigured(cfg);

  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("⚙️ Configuração do bot de tickets")
    .setDescription(
      `Servidor: **${guild.name}**\n\n` +
        `Use o menu abaixo para configurar cada área.\n\n` +
        `**Status**\n` +
        `${check(cfg.ticketCategoryId)} Categoria de tickets\n` +
        `${check(cfg.supportRoleIds.length)} Cargos de suporte (${cfg.supportRoleIds.length})\n` +
        `${check(cfg.logChannelId)} Canal de logs\n` +
        `${check(typesCount > 0)} Tipos de ticket (${typesCount})\n\n` +
        `**Pronto para publicar:** ${ready ? "✅ Sim" : "❌ Não — configure categoria e cargos"}`
    )
    .setFooter({ text: "Unity Ticket · Painel de configuração" });
}

export function buildCanaisEmbed(cfg) {
  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("📁 Canais")
    .setDescription(
      "Selecione nos menus abaixo (salva automaticamente).\n\n" +
        `**Categoria padrão:** ${cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : "— não definida"}\n` +
        `**Canal de logs:** ${cfg.logChannelId ? `<#${cfg.logChannelId}>` : "— não definido"}`
    );
}

export function buildEquipeEmbed(cfg) {
  const roles =
    cfg.supportRoleIds.length > 0
      ? cfg.supportRoleIds.map((id) => `<@&${id}>`).join(", ")
      : "— nenhum cargo selecionado";

  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("👥 Equipe de suporte")
    .setDescription(
      "Selecione um ou mais cargos no menu abaixo.\n\n" +
        `**Cargos atuais:** ${roles}`
    );
}

export function buildAparenciaEmbed(cfg) {
  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("🎨 Aparência do painel público")
    .setDescription(
      "Use os botões para editar. Para **apagar** descrição, regras, rodapé ou imagem, use o menu **Limpar** ou digite **APAGAR** no modal.\n\n" +
        `**Título:** ${cfg.panelTitle}\n` +
        `**Descrição extra:** ${cfg.panelDescription?.trim() || "—"}\n` +
        `**Regras:** ${cfg.panelRules?.trim() ? `${cfg.panelRules.trim().slice(0, 120)}${cfg.panelRules.length > 120 ? "…" : ""}` : "—"}\n` +
        `**Imagem:** ${cfg.panelImageUrl || "—"}\n` +
        `**Rodapé:** ${cfg.panelFooter || "—"}\n` +
        `**Cor:** ${hexColor(cfg.ticketPanelColor)}`
    );
}

export function buildTiposEmbed(guildId, cfg, selectedTipo = null) {
  const types = listTicketTypes(guildId);
  const lines = types.length
    ? types
        .map(
          (t) =>
            `• ${t.emoji || "📋"} **${t.label}** (\`${t.value}\`)${
              t.category_id ? ` — <#${t.category_id}>` : ""
            }`
        )
        .join("\n")
    : "_Nenhum tipo cadastrado._";

  const selected = selectedTipo
    ? types.find((t) => t.value === selectedTipo)
    : null;
  const selectionLine = selected
    ? `\n\n**Selecionado:** ${selected.emoji || "📋"} **${selected.label}** (\`${selected.value}\`)`
    : "\n\n_Selecione um tipo no menu para editar ou remover._";

  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("🎫 Tipos de ticket")
    .setDescription(
      `${lines}${selectionLine}\n\nMáximo **25** tipos. ID interno deve ser único (ex: \`suporte\`).`
    );
}

export function buildComportamentoEmbed(cfg) {
  const inact =
    cfg.inactivityHours > 0
      ? `${cfg.inactivityHours}h (aviso só na DM de quem abriu)`
      : "Desligado";

  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("⚡ Comportamento")
    .setDescription(
      `**Inatividade:** ${inact}\n` +
        `**DM com transcript ao fechar:** ${cfg.sendDmOnClose ? "✅ Ligado" : "❌ Desligado"}\n\n` +
        "_Token e deploy continuam no arquivo `.env`_"
    );
}

export function buildWelcomeEmbed(cfg, ws) {
  const entrada = ws?.welcome_channel_id ? `<#${ws.welcome_channel_id}>` : "— não definido";
  const saida = ws?.goodbye_channel_id ? `<#${ws.goodbye_channel_id}>` : "— não definido";
  const dm = ws?.welcome_dm ? `✅ Ativa — "${ws.welcome_dm.slice(0, 60)}${ws.welcome_dm.length > 60 ? "…" : ""}"` : "❌ Desativada";

  let roles = "— nenhum";
  try {
    const ids = JSON.parse(ws?.auto_role_ids ?? "[]");
    if (ids.length) roles = ids.map((id) => `<@&${id}>`).join(", ");
  } catch { /* */ }

  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("👋 Boas-vindas")
    .setDescription(
      `**Canal de entrada:** ${entrada}\n` +
        `**Canal de saída:** ${saida}\n` +
        `**Auto-cargo:** ${roles}\n` +
        `**DM de boas-vindas:** ${dm}\n\n` +
        "Use os botões para editar mensagens.\n" +
        "_Variáveis: `{usuario}` `{tag}` `{servidor}` `{membros}`_"
    );
}

export function buildLogsEmbed(cfg, logSettings) {
  const channel = logSettings?.log_channel_id
    ? `<#${logSettings.log_channel_id}>`
    : "— não definido";

  let enabledEvents = [];
  try { enabledEvents = JSON.parse(logSettings?.events_enabled ?? "[]"); } catch { /* */ }

  const EVENT_LABELS = {
    message_edit: "Mensagens editadas",
    message_delete: "Mensagens apagadas",
    member_join: "Entrada de membros",
    member_leave: "Saída de membros",
    member_ban: "Banimentos",
    member_unban: "Remoção de ban",
    role_change: "Mudança de cargos",
    nickname_change: "Mudança de apelido",
  };

  const eventLines = Object.entries(EVENT_LABELS)
    .map(([key, label]) => `${enabledEvents.includes(key) ? "✅" : "❌"} ${label}`)
    .join("\n");

  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("📋 Logs do servidor")
    .setDescription(
      `**Canal de logs:** ${channel}\n\n**Eventos monitorados:**\n${eventLines}\n\n` +
        "_Use os botões para ligar/desligar cada evento._"
    );
}

export function buildPublicarEmbed(cfg, ready) {
  return new EmbedBuilder()
    .setColor(cfg.ticketPanelColor)
    .setTitle("📢 Publicar painel")
    .setDescription(
      ready
        ? "Escolha o canal onde o painel público de tickets será enviado."
        : "⚠️ Configure **categoria** e **cargos de suporte** antes de publicar.\n\nVá em **Canais** e **Equipe** no menu principal."
    );
}
