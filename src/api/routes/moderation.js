import { Router } from "express";
import { PermissionFlagsBits } from "discord.js";
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

// GET /api/guilds/:guildId/moderation/channels — lista canais de texto com slowmode e lock
router.get("/:guildId/moderation/channels", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const guild = req.discordClient?.guilds?.cache?.get(guildId);
  if (!guild) return res.status(404).json({ error: "Servidor não encontrado." });

  try {
    const channels = guild.channels.cache
      .filter(c => c.type === 0) // GuildText
      .map(c => {
        const overwrite = c.permissionOverwrites?.cache?.get(guildId);
        return {
          id: c.id,
          name: c.name,
          slowmode: c.rateLimitPerUser ?? 0,
          locked: overwrite?.deny?.has(PermissionFlagsBits.SendMessages) ?? false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ channels });
  } catch (err) {
    console.error("[moderation/channels] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar canais." });
  }
});

// POST /api/guilds/:guildId/moderation/channels/:channelId/slowmode
router.post("/:guildId/moderation/channels/:channelId/slowmode", requireAuth, async (req, res) => {
  const { guildId, channelId } = req.params;
  const { seconds } = req.body;

  const guild = req.discordClient?.guilds?.cache?.get(guildId);
  if (!guild) return res.status(404).json({ error: "Servidor não encontrado." });

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return res.status(404).json({ error: "Canal não encontrado." });

  try {
    const s = Math.max(0, Math.min(21600, Number(seconds) || 0));
    await channel.setRateLimitPerUser(s);
    res.json({ ok: true, slowmode: s });
  } catch (err) {
    console.error("[moderation/slowmode] Erro:", err);
    res.status(500).json({ error: "Erro ao aplicar modo lento." });
  }
});

// POST /api/guilds/:guildId/moderation/channels/:channelId/lock
router.post("/:guildId/moderation/channels/:channelId/lock", requireAuth, async (req, res) => {
  const { guildId, channelId } = req.params;
  const { locked } = req.body;

  const guild = req.discordClient?.guilds?.cache?.get(guildId);
  if (!guild) return res.status(404).json({ error: "Servidor não encontrado." });

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return res.status(404).json({ error: "Canal não encontrado." });

  try {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      SendMessages: locked ? false : null,
    });
    res.json({ ok: true, locked: !!locked });
  } catch (err) {
    console.error("[moderation/lock] Erro:", err);
    res.status(500).json({ error: "Erro ao alterar permissões do canal." });
  }
});

export default router;
