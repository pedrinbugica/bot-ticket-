import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getStats } from "../../db/tickets.js";
import { getRecentCases } from "../../db/infractions.js";
import { getLeaderboard } from "../../db/leveling.js";
import { getLevelSettings } from "../../db/leveling.js";
import { getWelcomeSettings } from "../../db/welcomeSettings.js";
import { getLogSettings } from "../../db/auditLog.js";
import { getAutomodSettings } from "../../db/automod.js";
import { getStarboardConfig } from "../../db/starboard.js";
import { getJtcConfig } from "../../db/jtc.js";
import { getBirthdaySettings } from "../../db/birthdays.js";
import { getCountingChannel } from "../../db/counting.js";
import { listActiveGiveaways } from "../../db/giveaway.js";
import { listActivePolls } from "../../db/polls.js";

const router = Router();

// GET /api/guilds/:guildId/overview
router.get("/:guildId/overview", requireAuth, (req, res) => {
  const { guildId } = req.params;

  try {
    const ticketStats = getStats(guildId);
    const recentInfractions = getRecentCases(guildId, 5);
    const topXp = getLeaderboard(guildId, 5);
    const levelSettings = getLevelSettings(guildId);
    const welcomeSettings = getWelcomeSettings(guildId);
    const logSettings = getLogSettings(guildId);
    const { settings: automodSettings } = getAutomodSettings(guildId);
    const starboard = getStarboardConfig(guildId);
    const jtc = getJtcConfig(guildId);
    const birthdaySettings = getBirthdaySettings(guildId);
    const counting = getCountingChannel(guildId);
    const activeGiveaways = listActiveGiveaways(guildId);
    const activePolls = listActivePolls(guildId);

    const modules = {
      tickets: { enabled: true },
      welcome: { enabled: !!(welcomeSettings?.welcome_channel_id) },
      logs: { enabled: !!(logSettings?.log_channel_id) },
      automod: { enabled: !!(automodSettings?.word_filter_enabled || automodSettings?.spam_enabled || automodSettings?.link_filter_enabled) },
      leveling: { enabled: !!(levelSettings?.enabled) },
      starboard: { enabled: !!(starboard?.enabled ?? (starboard ? 1 : 0)) },
      jtc: { enabled: !!(jtc) },
      birthdays: { enabled: !!(birthdaySettings?.channel_id) },
      counting: { enabled: !!(counting?.channel_id) },
    };

    res.json({
      guildId,
      tickets: ticketStats,
      recentInfractions,
      topXp,
      activeGiveaways: activeGiveaways.length,
      activePolls: activePolls.length,
      modules,
    });
  } catch (err) {
    console.error("[overview] Erro:", err);
    res.status(500).json({ error: "Erro interno ao buscar overview." });
  }
});

export default router;
