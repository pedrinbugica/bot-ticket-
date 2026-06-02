import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getGuildSettingsRow, upsertGuildSettings } from "../../db/guildSettings.js";
import { getWelcomeSettings, upsertWelcomeSettings } from "../../db/welcomeSettings.js";
import { getLogSettings, upsertLogSettings, ALL_EVENTS } from "../../db/auditLog.js";
import { getAutomodSettings, upsertAutomodSettings, addBadWord, removeBadWord, listBadWords } from "../../db/automod.js";
import { getStarboardConfig, upsertStarboardConfig, disableStarboard } from "../../db/starboard.js";
import { getJtcConfig, upsertJtcConfig, removeJtcConfig } from "../../db/jtc.js";
import { getBirthdaySettings, upsertBirthdaySettings } from "../../db/birthdays.js";
import { getCountingChannel, setCountingChannel, removeCountingChannel } from "../../db/counting.js";
import { listStatsChannels, upsertStatsChannel, removeStatsChannel, STAT_TYPES } from "../../db/stats.js";

const router = Router();

// GET /api/guilds/:guildId/modules — todos os módulos de uma vez
router.get("/:guildId/modules", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const tickets = getGuildSettingsRow(guildId);
    const welcome = getWelcomeSettings(guildId);
    const logs = getLogSettings(guildId);
    const { settings: automod, words: badWords } = getAutomodSettings(guildId);
    const starboard = getStarboardConfig(guildId);
    const jtc = getJtcConfig(guildId);
    const birthdays = getBirthdaySettings(guildId);
    const counting = getCountingChannel(guildId);
    const statsChannels = listStatsChannels(guildId);

    res.json({
      tickets,
      welcome,
      logs: { ...logs, allEvents: ALL_EVENTS },
      automod,
      badWords,
      starboard,
      jtc,
      birthdays,
      counting,
      statsChannels,
    });
  } catch (err) {
    console.error("[modules] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar módulos." });
  }
});

// ── TICKETS ────────────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/tickets
router.patch("/:guildId/modules/tickets", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const allowed = ["ticket_category_id", "support_role_ids", "panel_color", "panel_title", "panel_footer", "panel_description", "panel_rules", "panel_image_url", "inactivity_hours", "send_dm_on_close"];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  try {
    upsertGuildSettings(guildId, patch);
    res.json({ ok: true, settings: getGuildSettingsRow(guildId) });
  } catch (err) {
    console.error("[modules/tickets PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de tickets." });
  }
});

// ── BOAS-VINDAS ────────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/welcome
router.patch("/:guildId/modules/welcome", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const allowed = ["welcome_channel_id", "welcome_message", "goodbye_channel_id", "goodbye_message", "welcome_dm", "auto_role_ids"];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  try {
    upsertWelcomeSettings(guildId, patch);
    res.json({ ok: true, settings: getWelcomeSettings(guildId) });
  } catch (err) {
    console.error("[modules/welcome PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de boas-vindas." });
  }
});

// ── LOGS ──────────────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/logs
router.patch("/:guildId/modules/logs", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const allowed = ["log_channel_id", "events_enabled"];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  if (patch.events_enabled && Array.isArray(patch.events_enabled)) {
    patch.events_enabled = JSON.stringify(patch.events_enabled);
  }

  try {
    upsertLogSettings(guildId, patch);
    res.json({ ok: true, settings: getLogSettings(guildId) });
  } catch (err) {
    console.error("[modules/logs PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de logs." });
  }
});

// ── AUTO-MOD ──────────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/automod
router.patch("/:guildId/modules/automod", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const allowed = ["word_filter_enabled", "word_filter_action", "spam_enabled", "spam_msg_count", "spam_window_secs", "spam_action", "mention_limit", "raid_enabled", "raid_join_count", "raid_window_secs", "link_filter_enabled", "exempt_role_ids", "exempt_channel_ids"];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  try {
    upsertAutomodSettings(guildId, patch);
    const { settings } = getAutomodSettings(guildId);
    res.json({ ok: true, settings });
  } catch (err) {
    console.error("[modules/automod PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de auto-mod." });
  }
});

// POST /api/guilds/:guildId/modules/automod/words
router.post("/:guildId/modules/automod/words", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { word, action = "delete" } = req.body;

  if (!word) return res.status(400).json({ error: "Campo word obrigatório." });

  try {
    addBadWord(guildId, word, action);
    res.json({ ok: true, words: listBadWords(guildId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/guilds/:guildId/modules/automod/words/:word
router.delete("/:guildId/modules/automod/words/:word", requireAuth, (req, res) => {
  const { guildId, word } = req.params;

  try {
    removeBadWord(guildId, word);
    res.json({ ok: true, words: listBadWords(guildId) });
  } catch (err) {
    console.error("[automod/words DELETE] Erro:", err);
    res.status(500).json({ error: "Erro ao remover palavra." });
  }
});

// ── STARBOARD ─────────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/starboard
router.patch("/:guildId/modules/starboard", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { channelId, emoji = "⭐", minReactions = 3, enabled } = req.body;

  try {
    if (enabled === false) {
      disableStarboard(guildId);
    } else if (channelId) {
      upsertStarboardConfig(guildId, { channelId, emoji, minReactions });
    }
    res.json({ ok: true, config: getStarboardConfig(guildId) });
  } catch (err) {
    console.error("[modules/starboard PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de starboard." });
  }
});

// ── JTC ───────────────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/jtc
router.patch("/:guildId/modules/jtc", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { triggerChannelId, categoryId, nameTemplate, enabled } = req.body;

  try {
    if (enabled === false) {
      removeJtcConfig(guildId);
    } else if (triggerChannelId) {
      upsertJtcConfig(guildId, triggerChannelId, categoryId ?? null, nameTemplate ?? "🎮 {username}");
    }
    res.json({ ok: true, config: getJtcConfig(guildId) });
  } catch (err) {
    console.error("[modules/jtc PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de JTC." });
  }
});

// ── ANIVERSÁRIOS ──────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/birthdays
router.patch("/:guildId/modules/birthdays", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const allowed = ["channel_id", "message"];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  try {
    upsertBirthdaySettings(guildId, patch);
    res.json({ ok: true, settings: getBirthdaySettings(guildId) });
  } catch (err) {
    console.error("[modules/birthdays PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de aniversários." });
  }
});

// ── COUNTING ──────────────────────────────────────────────────────────────

// PATCH /api/guilds/:guildId/modules/counting
router.patch("/:guildId/modules/counting", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { channelId, enabled } = req.body;

  try {
    if (enabled === false) {
      removeCountingChannel(guildId);
    } else if (channelId) {
      setCountingChannel(guildId, channelId);
    }
    res.json({ ok: true, config: getCountingChannel(guildId) });
  } catch (err) {
    console.error("[modules/counting PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar config de counting." });
  }
});

// ── STATS CHANNELS ────────────────────────────────────────────────────────

// GET /api/guilds/:guildId/modules/stats
router.get("/:guildId/modules/stats", requireAuth, (req, res) => {
  const { guildId } = req.params;
  try {
    res.json({ channels: listStatsChannels(guildId), types: STAT_TYPES });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar canais de stats." });
  }
});

// POST /api/guilds/:guildId/modules/stats
router.post("/:guildId/modules/stats", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { statType, channelId, format } = req.body;
  if (!statType || !channelId) return res.status(400).json({ error: "statType e channelId obrigatórios." });
  if (!STAT_TYPES.includes(statType)) return res.status(400).json({ error: "Tipo inválido." });
  try {
    upsertStatsChannel(guildId, statType, channelId, format ?? null);
    res.json({ ok: true, channels: listStatsChannels(guildId) });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar canal de stats." });
  }
});

// DELETE /api/guilds/:guildId/modules/stats/:statType
router.delete("/:guildId/modules/stats/:statType", requireAuth, (req, res) => {
  const { guildId, statType } = req.params;
  try {
    removeStatsChannel(guildId, statType);
    res.json({ ok: true, channels: listStatsChannels(guildId) });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover canal de stats." });
  }
});

export default router;
