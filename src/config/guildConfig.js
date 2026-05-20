import { env } from "./env.js";
import { getGuildSettingsRow, upsertGuildSettings } from "../db/guildSettings.js";
import {
  listTicketTypes,
  getTicketTypeRow,
  rowToType,
  seedTicketTypes,
} from "../db/ticketTypes.js";
import { getDb } from "../db/index.js";

const cache = new Map();
const CACHE_TTL_MS = 60_000;

function parseRoleIds(json, guildId) {
  let ids = [];
  try {
    ids = JSON.parse(json || "[]");
  } catch {
    ids = [];
  }
  return ids.filter((id) => id && id !== guildId);
}

function rowToConfig(row, guildId) {
  if (!row) return null;
  return {
    guildId,
    ticketCategoryId: row.ticket_category_id,
    logChannelId: row.log_channel_id,
    supportRoleIds: parseRoleIds(row.support_role_ids, guildId),
    ticketPanelColor: row.panel_color,
    panelTitle: row.panel_title,
    panelFooter: row.panel_footer,
    panelDescription: row.panel_description,
    panelRules: row.panel_rules ?? "",
    panelImageUrl: row.panel_image_url ?? null,
    ticketCounter: row.ticket_counter,
    inactivityHours:
      row.inactivity_hours != null ? row.inactivity_hours : env.inactivityHours,
    sendDmOnClose:
      row.send_dm_on_close != null
        ? row.send_dm_on_close === 1
        : env.sendDmOnClose,
  };
}

export function invalidateGuildConfigCache(guildId) {
  cache.delete(guildId);
}

export async function ensureGuildConfig(guildId) {
  getDb();
  let row = getGuildSettingsRow(guildId);
  if (!row) {
    const seed =
      env.legacyGuildId === guildId
        ? env.legacySeed
        : {
            ticketCategoryId: null,
            logChannelId: null,
            supportRoleIds: [],
            panelColor: env.legacySeed.panelColor,
            panelTitle: env.legacySeed.panelTitle,
            panelFooter: env.legacySeed.panelFooter,
            panelDescription: env.legacySeed.panelDescription,
            panelRules: env.legacySeed.panelRules,
          };
    upsertGuildSettings(guildId, {
      ticket_category_id: seed.ticketCategoryId,
      log_channel_id: seed.logChannelId,
      support_role_ids: seed.supportRoleIds,
      panel_color: seed.panelColor,
      panel_title: seed.panelTitle,
      panel_footer: seed.panelFooter,
      panel_description: seed.panelDescription,
      panel_rules: seed.panelRules,
      inactivity_hours: env.inactivityHours,
      send_dm_on_close: env.sendDmOnClose ? 1 : 0,
    });
    seedTicketTypes(guildId, env.defaultTicketTypes);
    row = getGuildSettingsRow(guildId);
  }
  return rowToConfig(row, guildId);
}

export async function getGuildConfig(guildId) {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.config;

  const config = await ensureGuildConfig(guildId);
  cache.set(guildId, { config, at: Date.now() });
  return config;
}

export async function getTicketTypes(guildId) {
  await ensureGuildConfig(guildId);
  return listTicketTypes(guildId).map(rowToType);
}

export async function getTicketType(guildId, value) {
  await ensureGuildConfig(guildId);
  return rowToType(getTicketTypeRow(guildId, value));
}

export function isGuildConfigured(config) {
  return Boolean(
    config?.ticketCategoryId &&
      config.supportRoleIds?.length > 0
  );
}
