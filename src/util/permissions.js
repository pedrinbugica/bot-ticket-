import { PermissionFlagsBits } from "discord.js";
import { config } from "../config.js";

/** Verdadeiro se o membro tiver algum dos cargos listados em SUPPORT_ROLE_IDS / SUPPORT_ROLE_ID. */
export function memberIsStaff(member) {
  if (!member?.roles) return false;
  const ids = config.supportRoleIds;
  if (!ids.length) return false;
  for (const roleId of ids) {
    const id = String(roleId);
    if (member.roles.cache.has(id)) return true;
  }
  return false;
}

/**
 * Pode assumir/fechar tickets: apenas cargos de suporte configurados.
 * Não usa permissão "Administrador" do servidor — em muitos servidores cargos amplos têm esse bit e virariam "staff" por engano.
 */
export function memberCanManageTickets(member) {
  if (!member) return false;
  return memberIsStaff(member);
}

/**
 * Busca o membro no servidor antes de checar cargo/permissões (cache de interação pode estar incompleto).
 * Dono do servidor sempre pode gerenciar tickets (inclusive o próprio), sem precisar do cargo de suporte.
 */
export async function interactionMemberCanManageTickets(interaction) {
  if (!interaction.guild || !interaction.user) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;

  const member = await interaction.guild.members
    .fetch({ user: interaction.user.id, force: true })
    .catch(() => null);
  return member ? memberCanManageTickets(member) : false;
}

/** Quem pode enviar o painel: administrador (validação real no handler, não só no registro do comando). */
export async function interactionMemberCanPostTicketPanel(interaction) {
  if (!interaction.guild || !interaction.user) return false;
  const member = await interaction.guild.members
    .fetch({ user: interaction.user.id, force: true })
    .catch(() => null);
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator));
}
