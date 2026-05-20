import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { env } from "./config/env.js";
import { getDb } from "./db/index.js";
import { registerCommandsForAllGuilds } from "./commands/register.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (ready) => {
  getDb();
  const rest = new REST({ version: "10" }).setToken(env.token);
  try {
    await registerCommandsForAllGuilds(rest, Routes, ready);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
  await client.destroy();
  process.exit(process.exitCode ?? 0);
});

client.login(env.token).catch((err) => {
  console.error(err);
  process.exit(1);
});
