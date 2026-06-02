import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listTags, createTag, editTag, deleteTag, getTagSettings, setTagPrefix } from "../../db/tags.js";
import { listActiveGiveaways, endGiveaway, getEntryCount } from "../../db/giveaway.js";
import { listActivePolls, endPoll, getVoteCounts } from "../../db/polls.js";
import { getBirthdaySettings, getBirthday } from "../../db/birthdays.js";
import { listScheduledMessages, cancelScheduledMessage, insertScheduledMessage } from "../../db/scheduled.js";
import { getDb } from "../../db/index.js";

const router = Router();

// ── TAGS ──────────────────────────────────────────────────────────────────

// GET /api/guilds/:guildId/content/tags
router.get("/:guildId/content/tags", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const tags = listTags(guildId);
    const settings = getTagSettings(guildId);
    res.json({ tags, settings });
  } catch (err) {
    console.error("[content/tags] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar tags." });
  }
});

// POST /api/guilds/:guildId/content/tags
router.post("/:guildId/content/tags", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { trigger, response } = req.body;

  if (!trigger || !response) return res.status(400).json({ error: "trigger e response são obrigatórios." });

  try {
    createTag(guildId, trigger, response, req.user?.userId ?? "dashboard");
    res.json({ ok: true, tags: listTags(guildId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/guilds/:guildId/content/tags/:trigger
router.patch("/:guildId/content/tags/:trigger", requireAuth, (req, res) => {
  const { guildId, trigger } = req.params;
  const { response } = req.body;

  if (!response) return res.status(400).json({ error: "response é obrigatório." });

  try {
    editTag(guildId, trigger, response);
    res.json({ ok: true, tags: listTags(guildId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/guilds/:guildId/content/tags/:trigger
router.delete("/:guildId/content/tags/:trigger", requireAuth, (req, res) => {
  const { guildId, trigger } = req.params;

  try {
    deleteTag(guildId, trigger);
    res.json({ ok: true, tags: listTags(guildId) });
  } catch (err) {
    console.error("[content/tags DELETE] Erro:", err);
    res.status(500).json({ error: "Erro ao remover tag." });
  }
});

// PATCH /api/guilds/:guildId/content/tags/settings/prefix
router.patch("/:guildId/content/tags/settings/prefix", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { prefix } = req.body;

  if (!prefix) return res.status(400).json({ error: "prefix é obrigatório." });

  try {
    setTagPrefix(guildId, prefix);
    res.json({ ok: true, settings: getTagSettings(guildId) });
  } catch (err) {
    console.error("[tags/prefix] Erro:", err);
    res.status(500).json({ error: "Erro ao salvar prefixo." });
  }
});

// ── SORTEIOS ──────────────────────────────────────────────────────────────

// GET /api/guilds/:guildId/content/giveaways
router.get("/:guildId/content/giveaways", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const active = listActiveGiveaways(guildId);
    const ended = getDb()
      .prepare("SELECT * FROM giveaways WHERE guild_id = ? AND status = 'ended' ORDER BY ends_at DESC LIMIT 20")
      .all(guildId);

    const activeWithCounts = active.map((g) => ({
      ...g,
      entryCount: getEntryCount(g.id),
    }));

    res.json({ active: activeWithCounts, ended });
  } catch (err) {
    console.error("[content/giveaways] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar sorteios." });
  }
});

// DELETE /api/guilds/:guildId/content/giveaways/:id — encerrar sorteio
router.delete("/:guildId/content/giveaways/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    endGiveaway(Number(id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[content/giveaways DELETE] Erro:", err);
    res.status(500).json({ error: "Erro ao encerrar sorteio." });
  }
});

// ── ENQUETES ──────────────────────────────────────────────────────────────

// GET /api/guilds/:guildId/content/polls
router.get("/:guildId/content/polls", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const active = listActivePolls(guildId);
    const ended = getDb()
      .prepare("SELECT * FROM polls WHERE guild_id = ? AND status = 'ended' ORDER BY ends_at DESC LIMIT 20")
      .all(guildId);

    const activeWithVotes = active.map((p) => {
      const options = JSON.parse(p.options ?? "[]");
      const counts = getVoteCounts(p.id, options.length);
      return { ...p, options, voteCounts: counts };
    });

    res.json({ active: activeWithVotes, ended });
  } catch (err) {
    console.error("[content/polls] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar enquetes." });
  }
});

// DELETE /api/guilds/:guildId/content/polls/:id — encerrar enquete
router.delete("/:guildId/content/polls/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    endPoll(Number(id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[content/polls DELETE] Erro:", err);
    res.status(500).json({ error: "Erro ao encerrar enquete." });
  }
});

// ── ANIVERSÁRIOS ──────────────────────────────────────────────────────────

// GET /api/guilds/:guildId/content/birthdays
router.get("/:guildId/content/birthdays", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const settings = getBirthdaySettings(guildId);
    const list = getDb()
      .prepare("SELECT * FROM birthdays WHERE guild_id = ? ORDER BY month, day")
      .all(guildId);

    res.json({ settings, birthdays: list });
  } catch (err) {
    console.error("[content/birthdays] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar aniversários." });
  }
});

// DELETE /api/guilds/:guildId/content/birthdays/:userId
router.delete("/:guildId/content/birthdays/:userId", requireAuth, (req, res) => {
  const { guildId, userId } = req.params;

  try {
    getDb().prepare("DELETE FROM birthdays WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[content/birthdays DELETE] Erro:", err);
    res.status(500).json({ error: "Erro ao remover aniversário." });
  }
});

// ── MENSAGENS AGENDADAS ───────────────────────────────────────────────────

// GET /api/guilds/:guildId/content/scheduled
router.get("/:guildId/content/scheduled", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const pending = listScheduledMessages(guildId);
    const sent = getDb()
      .prepare("SELECT * FROM scheduled_messages WHERE guild_id = ? AND sent = 1 ORDER BY send_at DESC LIMIT 20")
      .all(guildId);

    res.json({ pending, sent });
  } catch (err) {
    console.error("[content/scheduled] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar mensagens agendadas." });
  }
});

// POST /api/guilds/:guildId/content/scheduled
router.post("/:guildId/content/scheduled", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { channelId, content, sendAt } = req.body;

  if (!channelId || !content || !sendAt) {
    return res.status(400).json({ error: "channelId, content e sendAt são obrigatórios." });
  }

  const sendDate = new Date(sendAt);
  if (isNaN(sendDate.getTime()) || sendDate <= new Date()) {
    return res.status(400).json({ error: "Data de envio deve ser no futuro." });
  }

  try {
    const id = insertScheduledMessage({
      guildId,
      channelId,
      content,
      sendAt: sendDate.toISOString().replace("T", " ").slice(0, 19),
      createdBy: req.user?.userId ?? "dashboard",
    });
    res.json({ ok: true, id });
  } catch (err) {
    console.error("[content/scheduled POST] Erro:", err);
    res.status(500).json({ error: "Erro ao agendar mensagem." });
  }
});

// DELETE /api/guilds/:guildId/content/scheduled/:id
router.delete("/:guildId/content/scheduled/:id", requireAuth, (req, res) => {
  const { guildId, id } = req.params;

  try {
    const changes = cancelScheduledMessage(guildId, Number(id));
    if (!changes) return res.status(404).json({ error: "Mensagem não encontrada ou já enviada." });
    res.json({ ok: true });
  } catch (err) {
    console.error("[content/scheduled DELETE] Erro:", err);
    res.status(500).json({ error: "Erro ao cancelar mensagem." });
  }
});

export default router;
