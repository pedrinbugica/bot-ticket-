import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../config.js";

const commands = [
  new SlashCommandBuilder()
    .setName("ticket-painel")
    .setDescription("Envia o painel para abrir tickets de atendimento")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((c) => c.toJSON());

function explainMissingAccess() {
  console.error(`
[Discord 50001 — Missing Access] Não foi possível registrar comandos neste servidor.

Verifique:
  1) GUILD_ID no .env é o ID do servidor ONDE O BOT ESTÁ (sem aspas, só números).
  2) Reconvide o bot com escopos: bot + applications.commands
     Portal → OAuth2 → URL Generator → escopos: bot, applications.commands
  3) O bot precisa estar online na lista de membros desse servidor.
`);
}

/**
 * Registra comandos slash no servidor (guild) para aparecerem rápido durante o desenvolvimento.
 */
export async function registerCommands(rest, Routes, clientId) {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, config.guildId),
      { body: commands }
    );
    console.log("Comandos slash registrados no servidor.");
  } catch (err) {
    if (err.code === 50001) {
      explainMissingAccess();
    }
    throw err;
  }
}
