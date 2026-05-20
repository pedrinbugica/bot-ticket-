import { MessageFlags } from "discord.js";
import { CFG_PREFIX, ID, SCREEN } from "./constants.js";
import { buildConfigView } from "./views.js";
import {
  buildAparenciaModal,
  buildInactModal,
  buildTipoAddModal,
  buildTipoEditModal,
  modalWantsClear,
} from "./modals.js";
import {
  getGuildConfig,
  invalidateGuildConfigCache,
  getTicketTypes,
} from "../config/guildConfig.js";
import { upsertGuildSettings } from "../db/guildSettings.js";
import {
  listTicketTypes,
  addTicketType,
  removeTicketType,
  updateTicketType,
  ticketTypeExists,
  getTicketTypeRow,
} from "../db/ticketTypes.js";
import { parseHexColor } from "../config/env.js";
import {
  buildPanelEmbed,
  buildTicketTypeSelectRow,
} from "../tickets/panel.js";
import { isGuildConfigured } from "../config/guildConfig.js";
import { buildPublicarEmbed } from "./builders.js";
import { normalizeEmojiInput } from "../util/emoji.js";
import { normalizePanelImageUrl } from "../util/panelUrl.js";
import { ensureDeferredEphemeral } from "../util/interactionAck.js";
import { getLogSettings, upsertLogSettings, toggleEvent, invalidateLogCache } from "../db/auditLog.js";
import { getWelcomeSettings, upsertWelcomeSettings, invalidateWelcomeCache } from "../db/welcomeSettings.js";
import { buildWelcomeMessageModal } from "./modals.js";

const tipoSelection = new Map();

function sessionKey(interaction) {
  return `${interaction.guild?.id}:${interaction.user.id}`;
}

function getSelectedTipo(interaction) {
  return tipoSelection.get(sessionKey(interaction)) ?? null;
}

function setSelectedTipo(interaction, value) {
  if (value) tipoSelection.set(sessionKey(interaction), value);
  else tipoSelection.delete(sessionKey(interaction));
}

async function render(interaction, screen, extra = {}) {
  const cfg = await getGuildConfig(interaction.guild.id);
  const logSettings = screen === SCREEN.LOGS ? getLogSettings(interaction.guild.id) : undefined;
  const welcomeSettings = screen === SCREEN.WELCOME ? getWelcomeSettings(interaction.guild.id) : undefined;
  return buildConfigView(interaction.guild, cfg, screen, {
    selectedTipo: extra.selectedTipo ?? getSelectedTipo(interaction),
    logSettings,
    welcomeSettings,
  });
}

async function deferInteraction(interaction) {
  if (interaction.deferred || interaction.replied) return;
  if (interaction.isChatInputCommand()) {
    await ensureDeferredEphemeral(interaction);
    return;
  }
  try {
    await interaction.deferUpdate();
  } catch (err) {
    if (err.code === 40060 || err.code === "InteractionAlreadyReplied") return;
    throw err;
  }
}

async function ephemeralReply(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

async function showConfigModal(interaction, modal) {
  if (interaction.deferred || interaction.replied) {
    await ephemeralReply(
      interaction,
      "Não foi possível abrir o formulário. Feche e abra **`/config painel`** novamente."
    );
    return false;
  }
  await interaction.showModal(modal);
  return true;
}

async function updateScreen(interaction, screen, extra = {}) {
  await deferInteraction(interaction);
  const payload = await render(interaction, screen, extra);
  await interaction.editReply(payload);
}

async function tiposNotice(interaction, message, selectedTipo) {
  await updateScreen(interaction, SCREEN.TIPOS, { selectedTipo });
  try {
    await interaction.followUp({
      content: `❌ ${message}`,
      flags: MessageFlags.Ephemeral,
    });
  } catch {
    /* ignore */
  }
}

export async function openConfigPanel(interaction) {
  await ensureDeferredEphemeral(interaction);
  const payload = await render(interaction, SCREEN.HOME);
  await interaction.editReply(payload);
}

export function isConfigUiInteraction(interaction) {
  if (interaction.isChatInputCommand()) return false;
  const id = interaction.customId;
  return id?.startsWith(CFG_PREFIX);
}

export async function handleConfigUiInteraction(interaction) {
  if (!interaction.guild || !isConfigUiInteraction(interaction)) return false;

  const guildId = interaction.guild.id;

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === ID.nav) {
      const screen = interaction.values[0];
      await updateScreen(interaction, screen);
      return true;
    }
    if (interaction.customId === ID.tipoSelect) {
      setSelectedTipo(interaction, interaction.values[0]);
      await updateScreen(interaction, SCREEN.TIPOS);
      return true;
    }
    if (interaction.customId === ID.apClear) {
      const field = interaction.values[0];
      const patch = {};
      if (field === "descricao") patch.panel_description = null;
      else if (field === "regras") patch.panel_rules = "";
      else if (field === "rodape") patch.panel_footer = null;
      else if (field === "imagem") patch.panel_image_url = null;

      upsertGuildSettings(guildId, patch);
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.APARENCIA);
      return true;
    }
  }

  if (interaction.isChannelSelectMenu()) {
    if (interaction.customId === ID.cat) {
      const ch = interaction.channels.first();
      upsertGuildSettings(guildId, { ticket_category_id: ch.id });
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.CANAIS);
      return true;
    }
    if (interaction.customId === ID.log) {
      const ch = interaction.channels.first();
      upsertGuildSettings(guildId, { log_channel_id: ch.id });
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.CANAIS);
      return true;
    }
    if (interaction.customId === ID.welcomeCh("entrada")) {
      const ch = interaction.channels.first();
      upsertWelcomeSettings(guildId, { welcome_channel_id: ch.id });
      invalidateWelcomeCache(guildId);
      await updateScreen(interaction, SCREEN.WELCOME);
      return true;
    }

    if (interaction.customId === ID.welcomeCh("saida")) {
      const ch = interaction.channels.first();
      upsertWelcomeSettings(guildId, { goodbye_channel_id: ch.id });
      invalidateWelcomeCache(guildId);
      await updateScreen(interaction, SCREEN.WELCOME);
      return true;
    }

    if (interaction.customId === ID.logsCh) {
      const ch = interaction.channels.first();
      upsertLogSettings(guildId, { log_channel_id: ch.id });
      invalidateLogCache(guildId);
      await updateScreen(interaction, SCREEN.LOGS);
      return true;
    }

    if (interaction.customId === ID.pubCh) {
      await deferInteraction(interaction);
      const cfg = await getGuildConfig(guildId);
      if (!isGuildConfigured(cfg)) {
        await interaction.editReply({
          content: "Configure categoria e cargos antes de publicar.",
          embeds: [],
          components: [],
        });
        return true;
      }
      const types = await getTicketTypes(guildId);
      if (!types.length) {
        await interaction.editReply({
          content: "Cadastre ao menos um tipo de ticket.",
          embeds: [],
          components: [],
        });
        return true;
      }
      const target = interaction.channels.first();
      const embed = buildPanelEmbed(interaction.guild, cfg);
      const row = buildTicketTypeSelectRow(types);
      await target.send({
        embeds: [embed],
        components: row ? [row] : [],
      });
      invalidateGuildConfigCache(guildId);
      const cfgAfter = await getGuildConfig(guildId);
      const view = await buildConfigView(interaction.guild, cfgAfter, SCREEN.PUBLICAR);
      const pubEmbed = buildPublicarEmbed(cfgAfter, true);
      pubEmbed.setDescription(
        `${pubEmbed.data.description}\n\n✅ **Publicado em** ${target}`
      );
      view.embeds = [pubEmbed];
      await interaction.editReply(view);
      return true;
    }
  }

  if (interaction.isRoleSelectMenu() && interaction.customId === ID.welcomeRoles) {
    const ids = interaction.roles.map((r) => r.id);
    upsertWelcomeSettings(guildId, { auto_role_ids: JSON.stringify(ids) });
    invalidateWelcomeCache(guildId);
    await updateScreen(interaction, SCREEN.WELCOME);
    return true;
  }

  if (interaction.isRoleSelectMenu() && interaction.customId === ID.roles) {
    const ids = interaction.roles.map((r) => r.id);
    upsertGuildSettings(guildId, { support_role_ids: ids });
    invalidateGuildConfigCache(guildId);
    await updateScreen(interaction, SCREEN.EQUIPE);
    return true;
  }

  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id === ID.back) {
      await updateScreen(interaction, SCREEN.HOME);
      return true;
    }

    if (id === ID.preview) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const cfg = await getGuildConfig(guildId);
      const embed = buildPanelEmbed(interaction.guild, cfg);
      const types = await getTicketTypes(guildId);
      const row = buildTicketTypeSelectRow(types);
      await interaction.editReply({
        embeds: [embed],
        components: row ? [row] : [],
      });
      return true;
    }

    if (id.startsWith(`${CFG_PREFIX}ap:`)) {
      const field = id.slice(`${CFG_PREFIX}ap:`.length);
      const cfg = await getGuildConfig(guildId);
      await showConfigModal(interaction, buildAparenciaModal(field, cfg));
      return true;
    }

    if (id === ID.tipoAdd) {
      await showConfigModal(interaction, buildTipoAddModal());
      return true;
    }

    if (id === ID.tipoEdit) {
      const value = getSelectedTipo(interaction);
      if (!value) {
        await ephemeralReply(interaction, "Selecione um tipo no menu acima.");
        return true;
      }
      await showConfigModal(interaction, buildTipoEditModal(guildId, value));
      return true;
    }

    if (id === ID.tipoDel) {
      const value = getSelectedTipo(interaction);
      if (!value) {
        await ephemeralReply(interaction, "Selecione um tipo no menu acima.");
        return true;
      }
      const n = removeTicketType(guildId, value);
      invalidateGuildConfigCache(guildId);
      setSelectedTipo(interaction, null);
      if (n) {
        await updateScreen(interaction, SCREEN.TIPOS);
      } else {
        await ephemeralReply(interaction, "Tipo não encontrado.");
      }
      return true;
    }

    if (id === ID.inactCustom) {
      const cfg = await getGuildConfig(guildId);
      await showConfigModal(interaction, buildInactModal(cfg));
      return true;
    }

    if (id.startsWith(`${CFG_PREFIX}inact:`)) {
      const hours = Number.parseInt(id.split(":").pop(), 10);
      upsertGuildSettings(guildId, { inactivity_hours: hours });
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.COMPORTAMENTO);
      return true;
    }

    if (id.startsWith(`${CFG_PREFIX}welcome:edit:`)) {
      const type = id.slice(`${CFG_PREFIX}welcome:edit:`.length);
      const ws = getWelcomeSettings(guildId);
      const currentValue = type === "entrada" ? ws?.welcome_message
        : type === "saida" ? ws?.goodbye_message
        : ws?.welcome_dm;
      await showConfigModal(interaction, buildWelcomeMessageModal(type, currentValue));
      return true;
    }

    if (id.startsWith(`${CFG_PREFIX}logs:toggle:`)) {
      const eventType = id.slice(`${CFG_PREFIX}logs:toggle:`.length);
      toggleEvent(guildId, eventType);
      await updateScreen(interaction, SCREEN.LOGS);
      return true;
    }

    if (id === ID.dmToggle) {
      const cfg = await getGuildConfig(guildId);
      upsertGuildSettings(guildId, {
        send_dm_on_close: cfg.sendDmOnClose ? 0 : 1,
      });
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.COMPORTAMENTO);
      return true;
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith(`${CFG_PREFIX}modal:ap:`)) {
      const field = interaction.customId.slice(`${CFG_PREFIX}modal:ap:`.length);
      const valor = interaction.fields.getTextInputValue("valor") ?? "";
      const patch = {};

      if (field === "titulo") {
        if (!valor.trim()) {
          await updateScreen(interaction, SCREEN.APARENCIA);
          await interaction.followUp({
            content: "❌ O título não pode ficar em branco.",
            flags: MessageFlags.Ephemeral,
          });
          return true;
        }
        patch.panel_title = valor.trim();
      } else if (field === "descricao") {
        patch.panel_description = modalWantsClear(interaction) ? null : valor.trim() || null;
      } else if (field === "regras") {
        patch.panel_rules = modalWantsClear(interaction) ? "" : valor.trim();
      } else if (field === "cor") {
        patch.panel_color = parseHexColor(valor);
      } else if (field === "rodape") {
        patch.panel_footer = modalWantsClear(interaction) ? null : valor.trim() || null;
      } else if (field === "imagem") {
        if (modalWantsClear(interaction)) {
          patch.panel_image_url = null;
        } else {
          const trimmed = valor.trim();
          if (trimmed) {
            const url = normalizePanelImageUrl(trimmed);
            if (!url) {
              await updateScreen(interaction, SCREEN.APARENCIA);
              await interaction.followUp({
                content: "❌ URL inválida. Use um link **https://** direto da imagem.",
                flags: MessageFlags.Ephemeral,
              });
              return true;
            }
            patch.panel_image_url = url;
          } else {
            patch.panel_image_url = null;
          }
        }
      }

      upsertGuildSettings(guildId, patch);
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.APARENCIA);
      return true;
    }

    if (interaction.customId.startsWith(`${CFG_PREFIX}welcome:modal:`)) {
      const type = interaction.customId.slice(`${CFG_PREFIX}welcome:modal:`.length);
      const valor = interaction.fields.getTextInputValue("mensagem")?.trim() || null;
      const field = type === "entrada" ? "welcome_message"
        : type === "saida" ? "goodbye_message"
        : "welcome_dm";
      upsertWelcomeSettings(guildId, { [field]: valor });
      invalidateWelcomeCache(guildId);
      await updateScreen(interaction, SCREEN.WELCOME);
      return true;
    }

    if (interaction.customId === ID.modalInact) {
      const raw = interaction.fields.getTextInputValue("horas");
      const hours = Math.max(0, Math.min(720, Number.parseInt(raw, 10) || 0));
      upsertGuildSettings(guildId, { inactivity_hours: hours });
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.COMPORTAMENTO);
      return true;
    }

    if (interaction.customId === ID.modalTipoAdd) {
      const value = interaction.fields
        .getTextInputValue("valor")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      const label = interaction.fields.getTextInputValue("nome");
      const description = interaction.fields.getTextInputValue("descricao") ?? "";
      const emoji = normalizeEmojiInput(
        interaction.fields.getTextInputValue("emoji")
      );

      if (!value) {
        await tiposNotice(
          interaction,
          "ID interno inválido. Use apenas letras, números, _ e -.",
          getSelectedTipo(interaction)
        );
        return true;
      }
      if (!label?.trim()) {
        await tiposNotice(interaction, "Informe o nome exibido do tipo.", getSelectedTipo(interaction));
        return true;
      }
      if (ticketTypeExists(guildId, value)) {
        await tiposNotice(
          interaction,
          `O ID \`${value}\` já existe. Escolha outro ID ou edite o tipo existente.`,
          value
        );
        return true;
      }
      if (listTicketTypes(guildId).length >= 25) {
        await tiposNotice(interaction, "Limite de 25 tipos atingido.", getSelectedTipo(interaction));
        return true;
      }
      try {
        addTicketType(guildId, {
          value,
          label: label.trim(),
          description,
          emoji,
        });
      } catch (err) {
        await tiposNotice(interaction, err.message, getSelectedTipo(interaction));
        return true;
      }
      invalidateGuildConfigCache(guildId);
      setSelectedTipo(interaction, value);
      await updateScreen(interaction, SCREEN.TIPOS, { selectedTipo: value });
      return true;
    }

    if (interaction.customId.startsWith(`${CFG_PREFIX}modal:tipo:edit:`)) {
      const value = interaction.customId.slice(`${CFG_PREFIX}modal:tipo:edit:`.length);
      const label = interaction.fields.getTextInputValue("nome");
      const description = interaction.fields.getTextInputValue("descricao") ?? "";
      const emoji = normalizeEmojiInput(
        interaction.fields.getTextInputValue("emoji")
      );

      if (!getTicketTypeRow(guildId, value)) {
        await tiposNotice(interaction, `Tipo \`${value}\` não encontrado.`, null);
        return true;
      }
      if (!label?.trim()) {
        await tiposNotice(interaction, "Informe o nome exibido do tipo.", value);
        return true;
      }

      updateTicketType(guildId, value, {
        label: label.trim(),
        description,
        emoji,
      });
      invalidateGuildConfigCache(guildId);
      await updateScreen(interaction, SCREEN.TIPOS, { selectedTipo: value });
      return true;
    }
  }

  return false;
}
