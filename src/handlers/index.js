import { MessageFlags } from "discord.js";
import { handleTicketPanelCommand, SELECT_CUSTOM_ID } from "../tickets/panel.js";
import {
  handleTicketTypeSelect,
  handleOpenModalSubmit,
  OPEN_MODAL_ID,
} from "../tickets/open.js";
import {
  handleTicketClaim,
  handleTicketCloseCancel,
  handleTicketCloseConfirm,
  handleTicketCloseStep1,
  handleTicketRequestClose,
  handleCloseReasonModal,
  CLOSE_REASON_MODAL_ID,
} from "../tickets/actions.js";
import {
  handleTicketAddMember,
  handleTicketRemoveMember,
  handleTicketStats,
} from "../tickets/members.js";
import { handleConfigCommand } from "../commands/handlers/config.js";
import { handleModCommand } from "../commands/handlers/mod.js";
import { handleRolesCommand } from "../commands/handlers/roles.js";
import { handleAutomodCommand } from "../commands/handlers/automod.js";
import { handleGiveawayCommand } from "../commands/handlers/giveaway.js";
import { handleGiveawayButton } from "../giveaway/giveaway.js";
import { handlePollsCommand } from "../commands/handlers/polls.js";
import { handleLevelingCommand } from "../commands/handlers/leveling.js";
import { handleTagsCommand } from "../commands/handlers/tags.js";
import { handleConfigurarCommand } from "../commands/handlers/configurar.js";
import { handlePollButton } from "../polls/polls.js";
import { handleRoleMenuSelect } from "../roles/roleMenu.js";
import {
  handleConfigUiInteraction,
  isConfigUiInteraction,
} from "../config-ui/handlers.js";

export async function handleInteraction(interaction, client) {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ticket-painel") {
        await handleTicketPanelCommand(interaction);
        return;
      }
      if (await handleConfigCommand(interaction)) return;
      if (await handleModCommand(interaction)) return;
      if (await handleRolesCommand(interaction)) return;
      if (await handleAutomodCommand(interaction)) return;
      if (await handleGiveawayCommand(interaction, client)) return;
      if (await handlePollsCommand(interaction, client)) return;
      if (await handleLevelingCommand(interaction)) return;
      if (await handleTagsCommand(interaction)) return;
      if (await handleConfigurarCommand(interaction)) return;
      if (await handleTicketAddMember(interaction)) return;
      if (await handleTicketRemoveMember(interaction)) return;
      if (await handleTicketStats(interaction)) return;
      return;
    }

    if (isConfigUiInteraction(interaction)) {
      await handleConfigUiInteraction(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === SELECT_CUSTOM_ID) {
        await handleTicketTypeSelect(interaction, client);
        return;
      }
      if (await handleRoleMenuSelect(interaction)) return;
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === OPEN_MODAL_ID) {
        await handleOpenModalSubmit(interaction, client);
        return;
      }
      if (interaction.customId === CLOSE_REASON_MODAL_ID) {
        await handleCloseReasonModal(interaction);
        return;
      }
    }

    if (interaction.isButton()) {
      if (await handleGiveawayButton(interaction)) return;
      if (await handlePollButton(interaction)) return;
      if (await handleTicketClaim(interaction)) return;
      if (await handleTicketRequestClose(interaction)) return;
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
