/**
 * Registra comandos slash e encerra (útil em CI ou quando não quer manter o bot online).
 * O fluxo normal continua sendo `npm start` (registra no ready).
 */
import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { config } from "./config.js";
import { registerCommands } from "./commands/register.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (ready) => {
  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    await registerCommands(rest, Routes, ready.user.id);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
  await client.destroy();
  process.exit(process.exitCode ?? 0);
});

client.login(config.token).catch((err) => {
  console.error(err);
  process.exit(1);
});
