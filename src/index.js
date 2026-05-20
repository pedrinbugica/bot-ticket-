import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
} from "discord.js";
import { env } from "./config/env.js";
import { getDb } from "./db/index.js";
import { ensureGuildConfig } from "./config/guildConfig.js";
import {
  registerCommandsForAllGuilds,
  registerGuildCommands,
} from "./commands/register.js";
import { handleInteraction } from "./handlers/index.js";
import { acknowledgeInteraction } from "./util/interactionAck.js";
import { registerActivityTracking } from "./jobs/activity.js";
import { startInactivityJob } from "./jobs/inactivity.js";
import { startExpiredMutesJob } from "./jobs/expiredMutes.js";
import { registerServerLogEvents } from "./events/serverLog.js";
import { registerWelcomeEvents } from "./welcome/welcome.js";
import { registerReactionRoleEvents } from "./roles/reactionRoles.js";
import { registerAutomodEvents } from "./automod/detector.js";
import { startGiveawayJob } from "./jobs/giveaway.js";
import { startPollsJob } from "./jobs/polls.js";
import { registerLevelingEvents } from "./leveling/leveling.js";
import { registerTagEvents } from "./tags/tags.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
});

registerActivityTracking(client);
registerServerLogEvents(client);
registerWelcomeEvents(client);
registerReactionRoleEvents(client);
registerAutomodEvents(client);
registerLevelingEvents(client);
registerTagEvents(client);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Conectado como ${readyClient.user.tag}`);
  getDb();

  startInactivityJob(readyClient);
  startExpiredMutesJob(readyClient);
  startGiveawayJob(readyClient);
  startPollsJob(readyClient);

  const rest = new REST({ version: "10" }).setToken(env.token);
  setImmediate(() => {
    registerCommandsForAllGuilds(rest, Routes, readyClient).catch((err) => {
      console.error("Falha ao registrar comandos:", err);
      process.exit(1);
    });
  });
});

client.on(Events.GuildCreate, async (guild) => {
  await ensureGuildConfig(guild.id);
  if (!env.deployGlobal) {
    const rest = new REST({ version: "10" }).setToken(env.token);
    await registerGuildCommands(rest, Routes, client.user.id, guild.id).catch((err) => {
      console.error(`Falha ao registrar comandos em ${guild.name}:`, err);
    });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  await acknowledgeInteraction(interaction);
  await handleInteraction(interaction, client);
});

client.on(Events.Error, (err) => console.error("Erro do cliente Discord:", err));

client.login(env.token).catch((err) => {
  const msg = String(err?.message ?? err);
  if (msg.includes("disallowed intents")) {
    console.error(
      "Falha ao conectar: o bot pede intents que não estão ativos no Discord Developer Portal (Bot → Intenções privilegiadas)."
    );
  } else if (msg.includes("An invalid token") || msg.includes("TOKEN_INVALID")) {
    console.error("Falha ao conectar: DISCORD_TOKEN inválido no arquivo .env");
  } else {
    console.error("Falha ao conectar ao Discord:", msg);
  }
  process.exit(1);
});
