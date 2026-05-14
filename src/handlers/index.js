import { MessageFlags } from "discord.js";
import { handleTicketPanelCommand, SELECT_CUSTOM_ID } from "../tickets/panel.js";
import { handleTicketTypeSelect } from "../tickets/open.js";
import {
  handleTicketClaim,
  handleTicketCloseCancel,
  handleTicketCloseConfirm,
  handleTicketCloseStep1,
} from "../tickets/actions.js";

export async function handleInteraction(interaction, client) {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ticket-painel") {
        await handleTicketPanelCommand(interaction);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === SELECT_CUSTOM_ID) {
        await handleTicketTypeSelect(interaction, client);
      }
      return;
    }

    if (interaction.isButton()) {
      if (await handleTicketClaim(interaction)) return;
      if (await handleTicketCloseStep1(interaction)) return;
      if (await handleTicketCloseCancel(interaction)) return;
      if (await handleTicketCloseConfirm(interaction)) return;
    }
  } catch (err) {
    console.error("Erro ao processar interação:", err);
    const msg = "Ocorreu um erro ao processar esta ação. Tente novamente.";
    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({ content: msg });
      } else if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
    } catch {
      /* ignore */
    }
  }
}
