import { parseEmoji } from "discord.js";

/** Caracteres invisíveis que quebram emojis em components do Discord. */
const INVISIBLE_CHARS = /[\u200B-\u200D\uFEFF]/g;

export function sanitizeEmojiRaw(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(INVISIBLE_CHARS, "").trim();
  return s || null;
}

/**
 * Converte texto de emoji para o formato aceito por selects/botões do Discord.
 * Retorna null se vazio ou inválido (não chame setEmoji com null).
 */
export function resolveComponentEmoji(raw) {
  const s = sanitizeEmojiRaw(raw);
  if (!s) return null;

  const parsed = parseEmoji(s);
  if (!parsed) return null;

  if (parsed.id) {
    return {
      id: parsed.id,
      name: parsed.name,
      animated: Boolean(parsed.animated),
    };
  }

  const name = sanitizeEmojiRaw(parsed.name);
  if (!name) return null;

  try {
    if (!/\p{Extended_Pictographic}/u.test(name)) return null;
  } catch {
    return name.length <= 8 ? name : null;
  }

  return name;
}

export function normalizeEmojiInput(raw) {
  const resolved = resolveComponentEmoji(raw);
  if (resolved == null) return null;

  if (typeof resolved === "string") return resolved;

  return resolved.animated
    ? `<a:${resolved.name}:${resolved.id}>`
    : `<:${resolved.name}:${resolved.id}>`;
}

/** Aplica emoji em StringSelectMenuOptionBuilder só se válido. */
export function applyOptionEmoji(option, raw) {
  const emoji = resolveComponentEmoji(raw);
  if (emoji != null) option.setEmoji(emoji);
  return option;
}

/** Objeto de opção para addOptions({ ... }) sem chave emoji inválida. */
export function ticketTypeSelectOption(t) {
  const opt = {
    value: t.value,
    label: t.label.slice(0, 100),
    description: (t.description || " ").slice(0, 100),
  };
  const emoji = resolveComponentEmoji(t.emoji);
  if (emoji != null) opt.emoji = emoji;
  return opt;
}
