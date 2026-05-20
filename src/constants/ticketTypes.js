/** Reexporta tipos padrão do arquivo JSON (seed de novos servidores). */
import { env } from "../config/env.js";

export const TICKET_TYPES = env.defaultTicketTypes;

export function getTicketType(value) {
  return TICKET_TYPES.find((t) => t.value === value) ?? null;
}
