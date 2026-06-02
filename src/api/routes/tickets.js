import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../../db/index.js";
import { getStats } from "../../db/tickets.js";

const router = Router();

// GET /api/guilds/:guildId/tickets
router.get("/:guildId/tickets", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    const db = getDb();
    let query = "SELECT * FROM tickets WHERE guild_id = ?";
    const params = [guildId];

    // Filtro por status (active = na tabela, closed = em ticket_events)
    // tickets ativos ficam na tabela tickets; fechados são removidos mas ficam em ticket_events
    const rows = db
      .prepare(`${query} ORDER BY opened_at DESC LIMIT ? OFFSET ?`)
      .all(...params, Number(limit), Number(offset));

    const total = db.prepare("SELECT COUNT(*) as cnt FROM tickets WHERE guild_id = ?").get(guildId).cnt;
    const stats = getStats(guildId);

    res.json({ tickets: rows, total, stats });
  } catch (err) {
    console.error("[tickets] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar tickets." });
  }
});

// GET /api/guilds/:guildId/tickets/events
router.get("/:guildId/tickets/events", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { limit = 30 } = req.query;

  try {
    const rows = getDb()
      .prepare("SELECT * FROM ticket_events WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(guildId, Number(limit));

    res.json({ events: rows });
  } catch (err) {
    console.error("[tickets/events] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar eventos de ticket." });
  }
});

// GET /api/guilds/:guildId/tickets/:channelId
router.get("/:guildId/tickets/:channelId", requireAuth, (req, res) => {
  const { guildId, channelId } = req.params;

  try {
    const ticket = getDb()
      .prepare("SELECT * FROM tickets WHERE guild_id = ? AND channel_id = ?")
      .get(guildId, channelId);

    if (!ticket) return res.status(404).json({ error: "Ticket não encontrado." });

    const events = getDb()
      .prepare("SELECT * FROM ticket_events WHERE guild_id = ? AND channel_id = ? ORDER BY created_at ASC")
      .all(guildId, channelId);

    res.json({ ticket, events });
  } catch (err) {
    console.error("[tickets/:id] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar ticket." });
  }
});

export default router;
