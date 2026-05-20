import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { SCREEN, ID } from "./constants.js";
import {
  buildHomeEmbed,
  buildCanaisEmbed,
  buildEquipeEmbed,
  buildAparenciaEmbed,
  buildTiposEmbed,
  buildComportamentoEmbed,
  buildPublicarEmbed,
  buildLogsEmbed,
  buildWelcomeEmbed,
} from "./builders.js";
import { ALL_EVENTS } from "../db/auditLog.js";
import { isGuildConfigured } from "../config/guildConfig.js";
import { listTicketTypes } from "../db/ticketTypes.js";
import { applyOptionEmoji } from "../util/emoji.js";

const NAV_OPTIONS = [
  { value: SCREEN.CANAIS, label: "Canais", emoji: "📁" },
  { value: SCREEN.EQUIPE, label: "Equipe", emoji: "👥" },
  { value: SCREEN.APARENCIA, label: "Aparência do painel", emoji: "🎨" },
  { value: SCREEN.TIPOS, label: "Tipos de ticket", emoji: "🎫" },
  { value: SCREEN.COMPORTAMENTO, label: "Comportamento", emoji: "⚡" },
  { value: SCREEN.PUBLICAR, label: "Publicar painel", emoji: "📢" },
  { value: SCREEN.LOGS, label: "Logs do servidor", emoji: "📋" },
  { value: SCREEN.WELCOME, label: "Boas-vindas", emoji: "👋" },
];

function backRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.back)
      .setLabel("Voltar ao início")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("◀️")
  );
}

function navSelectRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(ID.nav)
      .setPlaceholder("Escolha uma seção para configurar…")
      .addOptions(
        NAV_OPTIONS.map((o) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(o.label)
            .setValue(o.value)
            .setEmoji(o.emoji)
        )
      )
  );
}

export async function buildConfigView(guild, cfg, screen, extra = {}) {
  switch (screen) {
    case SCREEN.CANAIS:
      return buildCanaisView(guild, cfg);
    case SCREEN.EQUIPE:
      return buildEquipeView(cfg);
    case SCREEN.APARENCIA:
      return buildAparenciaView(cfg);
    case SCREEN.TIPOS:
      return buildTiposView(guild.id, cfg, extra.selectedTipo);
    case SCREEN.COMPORTAMENTO:
      return buildComportamentoView(cfg);
    case SCREEN.PUBLICAR:
      return buildPublicarView(cfg);
    case SCREEN.LOGS:
      return buildLogsView(cfg, extra.logSettings);
    case SCREEN.WELCOME:
      return buildWelcomeView(cfg, extra.welcomeSettings);
    default:
      return buildHomeView(guild, cfg);
  }
}

function buildHomeView(guild, cfg) {
  return {
    embeds: [buildHomeEmbed(guild, cfg)],
    components: [navSelectRow()],
  };
}

function buildCanaisView(guild, cfg) {
  const catSelect = new ChannelSelectMenuBuilder()
    .setCustomId(ID.cat)
    .setPlaceholder("Categoria padrão dos tickets")
    .setChannelTypes(ChannelType.GuildCategory)
    .setMinValues(1)
    .setMaxValues(1);

  const logSelect = new ChannelSelectMenuBuilder()
    .setCustomId(ID.log)
    .setPlaceholder("Canal de logs ao fechar tickets")
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(1)
    .setMaxValues(1);

  return {
    embeds: [buildCanaisEmbed(cfg)],
    components: [
      new ActionRowBuilder().addComponents(catSelect),
      new ActionRowBuilder().addComponents(logSelect),
      backRow(),
    ],
  };
}

function buildEquipeView(cfg) {
  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(ID.roles)
    .setPlaceholder("Cargos de suporte")
    .setMinValues(1)
    .setMaxValues(25);

  if (cfg.supportRoleIds.length) {
    try {
      roleSelect.setDefaultRoles(cfg.supportRoleIds.slice(0, 25));
    } catch {
      /* cargo removido do servidor */
    }
  }

  return {
    embeds: [buildEquipeEmbed(cfg)],
    components: [new ActionRowBuilder().addComponents(roleSelect), backRow()],
  };
}

function buildAparenciaView(cfg) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.btnAparencia("titulo"))
      .setLabel("Título")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ID.btnAparencia("descricao"))
      .setLabel("Descrição")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ID.btnAparencia("regras"))
      .setLabel("Regras")
      .setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.btnAparencia("cor"))
      .setLabel("Cor")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ID.btnAparencia("rodape"))
      .setLabel("Rodapé")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ID.btnAparencia("imagem"))
      .setLabel("Imagem")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.preview)
      .setLabel("Pré-visualizar")
      .setStyle(ButtonStyle.Success)
  );

  const clearSelect = new StringSelectMenuBuilder()
    .setCustomId(ID.apClear)
    .setPlaceholder("Limpar descrição, regras, rodapé ou imagem…")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Limpar descrição extra")
        .setValue("descricao")
        .setEmoji("📝"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Limpar regras")
        .setValue("regras")
        .setEmoji("📋"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Limpar rodapé")
        .setValue("rodape")
        .setEmoji("⬇️"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Limpar imagem")
        .setValue("imagem")
        .setEmoji("🖼️")
    );

  return {
    embeds: [buildAparenciaEmbed(cfg)],
    components: [
      row1,
      row2,
      row3,
      new ActionRowBuilder().addComponents(clearSelect),
      backRow(),
    ],
  };
}

function buildTiposView(guildId, cfg, selectedTipo) {
  const types = listTicketTypes(guildId);
  const rows = [];

  if (types.length) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(ID.tipoSelect)
      .setPlaceholder("Selecione um tipo…")
      .addOptions(
        types.slice(0, 25).map((t) => {
          const opt = new StringSelectMenuOptionBuilder()
            .setLabel(t.label.slice(0, 100))
            .setValue(t.value)
            .setDescription((t.description || t.value).slice(0, 100));
          return applyOptionEmoji(opt, t.emoji);
        })
      );
    rows.push(new ActionRowBuilder().addComponents(select));
  }

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.tipoAdd)
      .setLabel("Adicionar")
      .setStyle(ButtonStyle.Success)
      .setDisabled(types.length >= 25),
    new ButtonBuilder()
      .setCustomId(ID.tipoEdit)
      .setLabel("Editar")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!selectedTipo),
    new ButtonBuilder()
      .setCustomId(ID.tipoDel)
      .setLabel("Remover")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!selectedTipo)
  );

  rows.push(actionRow, backRow());

  return {
    embeds: [buildTiposEmbed(guildId, cfg, selectedTipo)],
    components: rows,
  };
}

function buildComportamentoView(cfg) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.inact(12))
      .setLabel("12h")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ID.inact(24))
      .setLabel("24h")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ID.inact(48))
      .setLabel("48h")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(ID.inact(0))
      .setLabel("Desligar")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.inactCustom)
      .setLabel("Personalizar horas")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ID.dmToggle)
      .setLabel(cfg.sendDmOnClose ? "DM transcript: ON" : "DM transcript: OFF")
      .setStyle(cfg.sendDmOnClose ? ButtonStyle.Success : ButtonStyle.Danger)
  );

  return {
    embeds: [buildComportamentoEmbed(cfg)],
    components: [row1, row2, backRow()],
  };
}

function buildPublicarView(cfg) {
  const ready = isGuildConfigured(cfg);
  const rows = [backRow()];

  if (ready) {
    const chSelect = new ChannelSelectMenuBuilder()
      .setCustomId(ID.pubCh)
      .setPlaceholder("Canal onde publicar o painel")
      .setChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildForum
      )
      .setMinValues(1)
      .setMaxValues(1);
    rows.unshift(new ActionRowBuilder().addComponents(chSelect));
  }

  return {
    embeds: [buildPublicarEmbed(cfg, ready)],
    components: rows,
  };
}

const EVENT_TOGGLE_LABELS = {
  message_edit: "Msgs editadas",
  message_delete: "Msgs apagadas",
  member_join: "Entrada",
  member_leave: "Saída",
  member_ban: "Banimentos",
  member_unban: "Remoção ban",
  role_change: "Cargos",
  nickname_change: "Apelido",
};

function buildLogsView(cfg, logSettings) {
  let enabledEvents = [];
  try { enabledEvents = JSON.parse(logSettings?.events_enabled ?? "[]"); } catch { /* */ }

  const chSelect = new ChannelSelectMenuBuilder()
    .setCustomId(ID.logsCh)
    .setPlaceholder("Canal onde os logs serão enviados")
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(1)
    .setMaxValues(1);

  const eventPairs = [];
  const keys = ALL_EVENTS;
  for (let i = 0; i < keys.length; i += 2) {
    const buttons = keys.slice(i, i + 2).map((key) =>
      new ButtonBuilder()
        .setCustomId(ID.logsToggle(key))
        .setLabel(EVENT_TOGGLE_LABELS[key] ?? key)
        .setStyle(enabledEvents.includes(key) ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
    eventPairs.push(new ActionRowBuilder().addComponents(...buttons));
  }

  return {
    embeds: [buildLogsEmbed(cfg, logSettings)],
    components: [
      new ActionRowBuilder().addComponents(chSelect),
      ...eventPairs,
      backRow(),
    ],
  };
}

function buildWelcomeView(cfg, ws) {
  const welcomeChSelect = new ChannelSelectMenuBuilder()
    .setCustomId(ID.welcomeCh("entrada"))
    .setPlaceholder("Canal de boas-vindas (entrada)")
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(1).setMaxValues(1);

  const goodbyeChSelect = new ChannelSelectMenuBuilder()
    .setCustomId(ID.welcomeCh("saida"))
    .setPlaceholder("Canal de saída de membros")
    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(1).setMaxValues(1);

  const roleSelect = new RoleSelectMenuBuilder()
    .setCustomId(ID.welcomeRoles)
    .setPlaceholder("Auto-cargos ao entrar (opcional)")
    .setMinValues(0).setMaxValues(10);

  let autoRoleIds = [];
  try { autoRoleIds = JSON.parse(ws?.auto_role_ids ?? "[]"); } catch { /* */ }
  if (autoRoleIds.length) {
    try { roleSelect.setDefaultRoles(autoRoleIds.slice(0, 10)); } catch { /* */ }
  }

  const editRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(ID.welcomeEdit("entrada"))
      .setLabel("✏️ Msg entrada")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ID.welcomeEdit("saida"))
      .setLabel("✏️ Msg saída")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ID.welcomeEdit("dm"))
      .setLabel(ws?.welcome_dm ? "✏️ DM ativo" : "✏️ DM inativo")
      .setStyle(ws?.welcome_dm ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  return {
    embeds: [buildWelcomeEmbed(cfg, ws)],
    components: [
      new ActionRowBuilder().addComponents(welcomeChSelect),
      new ActionRowBuilder().addComponents(goodbyeChSelect),
      new ActionRowBuilder().addComponents(roleSelect),
      editRow,
      backRow(),
    ],
  };
}
