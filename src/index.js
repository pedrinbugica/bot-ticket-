import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
} from "discord.js";
import { config } from "./config.js";
import { registerCommands } from "./commands/register.js";
import { handleInteraction } from "./handlers/index.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Conectado como ${readyClient.user.tag}`);

  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    await registerCommands(rest, Routes, readyClient.user.id);
  } catch {
    process.exit(1);
  }
});

client.on(Events.InteractionCreate, (interaction) =>
  handleInteraction(interaction, client)
);

client.on(Events.Error, (err) => console.error("Erro do cliente Discord:", err));

client.login(config.token).catch((err) => {
  console.error("Falha ao fazer login. Verifique DISCORD_TOKEN no arquivo .env");
  console.error(err);
  process.exit(1);
});
