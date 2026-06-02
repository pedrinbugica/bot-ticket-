import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getRecentCases,
  getInfractionsByUser,
  getInfractionByCase,
  deactivateInfraction,
  insertInfraction,
} from "../../db/infractions.js";
import { getDb } from "../../db/index.js";

const router = Router();

// GET /api/guilds/:guildId/moderation — casos recentes
router.get("/:guildId/moderation", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { limit = 25 } = req.query;

  try {
    const cases = getRecentCases(guildId, Number(limit));

    const activeMutes = getDb()
      .prepare("SELECT * FROM infractions WHERE guild_id = ? AND action = 'mute' AND active = 1 ORDER BY created_at DESC")
      .all(guildId);

    const activeBans = getDb()
      .prepare("SELECT * FROM infractions WHERE guild_id = ? AND action = 'tempban' AND active = 1 ORDER BY created_at DESC")
      .all(guildId);

    const totalByAction = getDb()
      .prepare("SELECT action, COUNT(*) as cnt FROM infractions WHERE guild_id = ? AND active = 1 GROUP BY action")
      .all(guildId);

    res.json({ cases, activeMutes, activeBans, totalByAction });
  } catch (err) {
    console.error("[moderation] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar moderação." });
  }
});

// GET /api/guilds/:guildId/moderation/user/:userId — infrações de um usuário
router.get("/:guildId/moderation/user/:userId", requireAuth, (req, res) => {
  const { guildId, userId } = req.params;

  try {
    const infractions = getInfractionsByUser(guildId, userId);
    res.json({ infractions });
  } catch (err) {
    console.error("[moderation/user] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar infrações." });
  }
});

// DELETE /api/guilds/:guildId/moderation/:caseNumber — inativar caso
router.delete("/:guildId/moderation/:caseNumber", requireAuth, (req, res) => {
  const { guildId, caseNumber } = req.params;

  try {
    const infraction = getInfractionByCase(guildId, caseNumber);
    if (!infraction) return res.status(404).json({ error: "Caso não encontrado." });

    deactivateInfraction(infraction.id);
    res.json({ ok: true, message: `Caso #${caseNumber} inativado.` });
  } catch (err) {
    console.error("[moderation/delete] Erro:", err);
    res.status(500).json({ error: "Erro ao inativar caso." });
  }
});

export default router;
