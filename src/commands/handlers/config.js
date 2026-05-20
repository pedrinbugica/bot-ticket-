import { openConfigPanel } from "../../config-ui/handlers.js";
import { ensureDeferredEphemeral } from "../../util/interactionAck.js";

export async function handleConfigCommand(interaction) {
  if (interaction.commandName !== "config" || !interaction.guild) return false;

  const sub = interaction.options.getSubcommand(false);
  if (sub && sub !== "painel") {
    await ensureDeferredEphemeral(interaction);
    await interaction.editReply({
      content:
        "Este subcomando foi removido. Use **`/config painel`** para abrir o painel visual de configuração.",
    });
    return true;
  }

  await openConfigPanel(interaction);
  return true;
}
