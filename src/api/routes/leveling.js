import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getLeaderboard,
  getLevelSettings,
  getTotalUsersInLeaderboard,
  listLevelRoles,
  getXpMultipliers,
  upsertLevelSettings,
  resetUserXp,
  addLevelRole,
  removeLevelRole,
  upsertXpMultiplier,
  removeXpMultiplier,
} from "../../db/leveling.js";

const router = Router();

// GET /api/guilds/:guildId/leveling/leaderboard
router.get("/:guildId/leveling/leaderboard", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const entries = getLeaderboard(guildId, Number(limit), Number(offset));
    const total = getTotalUsersInLeaderboard(guildId);
    res.json({ entries, total, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    console.error("[leveling/leaderboard] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar leaderboard." });
  }
});

// GET /api/guilds/:guildId/leveling/settings
router.get("/:guildId/leveling/settings", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const settings = getLevelSettings(guildId);
    const roles = listLevelRoles(guildId);
    const multipliers = getXpMultipliers(guildId);
    res.json({ settings, roles, multipliers });
  } catch (err) {
    console.error("[leveling/settings] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar configurações de XP." });
  }
});

// PATCH /api/guilds/:guildId/leveling/settings
router.patch("/:guildId/leveling/settings", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const allowed = ["enabled", "levelup_channel_id", "xp_per_message", "xp_cooldown_secs", "voice_xp_enabled", "voice_xp_per_minute"];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

  try {
    upsertLevelSettings(guildId, patch);
    res.json({ ok: true, settings: getLevelSettings(guildId) });
  } catch (err) {
    console.error("[leveling/settings PATCH] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar configurações de XP." });
  }
});

// POST /api/guilds/:guildId/leveling/roles
router.post("/:guildId/leveling/roles", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { level, roleId } = req.body;

  if (!level || !roleId) return res.status(400).json({ error: "level e roleId são obrigatórios." });

  try {
    addLevelRole(guildId, Number(level), roleId);
    res.json({ ok: true, roles: listLevelRoles(guildId) });
  } catch (err) {
    console.error("[leveling/roles POST] Erro:", err);
    res.status(500).json({ error: "Erro ao adicionar recompensa de nível." });
  }
});

// DELETE /api/guilds/:guildId/leveling/roles/:level
router.delete("/:guildId/leveling/roles/:level", requireAuth, (req, res) => {
  const { guildId, level } = req.params;

  try {
    removeLevelRole(guildId, Number(level));
    res.json({ ok: true, roles: listLevelRoles(guildId) });
  } catch (err) {
    console.error("[leveling/roles DELETE] Erro:", err);
    res.status(500).json({ error: "Erro ao remover recompensa." });
  }
});

// POST /api/guilds/:guildId/leveling/multipliers
router.post("/:guildId/leveling/multipliers", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { targetType, targetId, multiplier } = req.body;

  if (!targetType || !targetId || multiplier === undefined) {
    return res.status(400).json({ error: "targetType, targetId e multiplier são obrigatórios." });
  }

  try {
    if (Number(multiplier) === 0) {
      removeXpMultiplier(guildId, targetType, targetId);
    } else {
      upsertXpMultiplier(guildId, targetType, targetId, Number(multiplier));
    }
    res.json({ ok: true, multipliers: getXpMultipliers(guildId) });
  } catch (err) {
    console.error("[leveling/multipliers POST] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar multiplicador." });
  }
});

// DELETE /api/guilds/:guildId/leveling/user/:userId/xp
router.delete("/:guildId/leveling/user/:userId/xp", requireAuth, (req, res) => {
  const { guildId, userId } = req.params;

  try {
    resetUserXp(guildId, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[leveling/reset] Erro:", err);
    res.status(500).json({ error: "Erro ao resetar XP." });
  }
});

export default router;
