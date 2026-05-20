import { buildCommandDefinitions } from "./definitions.js";
import { env } from "../config/env.js";

const commands = buildCommandDefinitions();

function explainMissingAccess(guildId) {
  console.error(`
[Discord 50001 — Missing Access] Não foi possível registrar comandos${guildId ? ` no servidor ${guildId}` : ""}.

Verifique:
  1) O bot está no servidor com escopos bot + applications.commands
  2) Reconvide o bot se necessário (Portal → OAuth2 → URL Generator)
`);
}

export async function registerGlobalCommands(rest, Routes, clientId) {
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Comandos slash registrados globalmente.");
  } catch (err) {
    if (err.code === 50001) explainMissingAccess();
    throw err;
  }
}

export async function registerGuildCommands(rest, Routes, clientId, guildId) {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`Comandos registrados no servidor ${guildId}.`);
  } catch (err) {
    if (err.code === 50001) explainMissingAccess(guildId);
    throw err;
  }
}

export async function registerCommandsForAllGuilds(rest, Routes, client, guildIds) {
  if (env.deployGlobal) {
    await registerGlobalCommands(rest, Routes, client.user.id);
    return;
  }
  const ids =
    guildIds ??
    [...client.guilds.cache.keys(), env.legacyGuildId].filter(Boolean);
  const unique = [...new Set(ids)];
  for (const guildId of unique) {
    await registerGuildCommands(rest, Routes, client.user.id, guildId);
  }
}
