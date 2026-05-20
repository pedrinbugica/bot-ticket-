import { MessageFlags } from "discord.js";
import { CFG_PREFIX, ID } from "../config-ui/constants.js";
import { OPEN_MODAL_ID } from "../tickets/open.js";
import { CLOSE_REASON_MODAL_ID } from "../tickets/actions.js";

/**
 * Botões de config que precisam de resposta imediata (modal, reply ou deferReply),
 * sem deferUpdate antecipado.
 */
function configButtonSkipsDeferUpdate(interaction) {
  if (!interaction.isButton()) return false;
  const id = interaction.customId;
  if (id === ID.preview) return true;
  if (id === ID.tipoAdd || id === ID.tipoEdit || id === ID.tipoDel) return true;
  if (id === ID.inactCustom) return true;
  if (id.startsWith(`${CFG_PREFIX}ap:`)) return true;
  if (id.startsWith(`${CFG_PREFIX}welcome:edit:`)) return true;
  return false;
}

/** deferReply efêmero; ignora se já reconhecida (evita 40060). */
export async function ensureDeferredEphemeral(interaction) {
  if (interaction.deferred || interaction.replied) return;
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (err) {
    if (err.code === 40060 || err.code === "InteractionAlreadyReplied") return;
    throw err;
  }
}

/**
 * Responde à interação em até 3s (regra do Discord). Deve rodar antes de qualquer lógica pesada.
 */
export async function acknowledgeInteraction(interaction) {
  if (interaction.replied || interaction.deferred) return;

  if (interaction.isChatInputCommand()) {
    // Slash commands são tratados pelos seus handlers (ex: openConfigPanel),
    // para evitar double-ack (Discord 40060).
    return;
  }

  if (interaction.isModalSubmit()) {
    const id = interaction.customId;
    if (id === OPEN_MODAL_ID || id === CLOSE_REASON_MODAL_ID) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
    } else if (id?.startsWith(CFG_PREFIX)) {
      await interaction.deferUpdate().catch(() => {});
    }
    return;
  }

  const id = interaction.customId;
  if (!id?.startsWith(CFG_PREFIX)) return;

  if (configButtonSkipsDeferUpdate(interaction)) return;

  await interaction.deferUpdate().catch(() => {});
}
