import { getDb } from "./index.js";
import { normalizeEmojiInput } from "../util/emoji.js";

export function listTicketTypes(guildId) {
  return getDb()
    .prepare(
      "SELECT * FROM ticket_types WHERE guild_id = ? ORDER BY sort_order ASC, id ASC"
    )
    .all(guildId);
}

export function getTicketTypeRow(guildId, value) {
  return getDb()
    .prepare("SELECT * FROM ticket_types WHERE guild_id = ? AND value = ?")
    .get(guildId, value);
}

export function ticketTypeExists(guildId, value) {
  return Boolean(getTicketTypeRow(guildId, value));
}

export function addTicketType(guildId, type) {
  if (ticketTypeExists(guildId, type.value)) {
    const err = new Error(`O ID \`${type.value}\` já existe neste servidor.`);
    err.code = "DUPLICATE";
    throw err;
  }

  const maxOrder = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM ticket_types WHERE guild_id = ?")
    .get(guildId).m;

  getDb()
    .prepare(
      `INSERT INTO ticket_types (guild_id, value, label, description, emoji, category_id, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      guildId,
      type.value,
      type.label,
      type.description ?? "",
      normalizeEmojiInput(type.emoji) ?? null,
      type.category_id ?? null,
      type.sort_order ?? maxOrder + 1
    );
}

export function removeTicketType(guildId, value) {
  return getDb()
    .prepare("DELETE FROM ticket_types WHERE guild_id = ? AND value = ?")
    .run(guildId, value).changes;
}

export function updateTicketType(guildId, value, patch) {
  const row = getTicketTypeRow(guildId, value);
  if (!row) return false;

  getDb()
    .prepare(
      `UPDATE ticket_types SET
        label = @label,
        description = @description,
        emoji = @emoji,
        category_id = @category_id
      WHERE guild_id = @guild_id AND value = @value`
    )
    .run({
      guild_id: guildId,
      value,
      label: patch.label ?? row.label,
      description: patch.description ?? row.description,
      emoji:
        patch.emoji !== undefined
          ? normalizeEmojiInput(patch.emoji)
          : row.emoji,
      category_id:
        patch.category_id !== undefined ? patch.category_id : row.category_id,
    });
  return true;
}

export function seedTicketTypes(guildId, types) {
  const count = getDb()
    .prepare("SELECT COUNT(*) AS c FROM ticket_types WHERE guild_id = ?")
    .get(guildId).c;
  if (count > 0) return;
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    addTicketType(guildId, {
      value: t.value,
      label: t.label,
      description: t.description ?? "",
      emoji: t.emoji ?? null,
      category_id: t.category_id ?? null,
      sort_order: i,
    });
  }
}

export function rowToType(row) {
  if (!row) return null;
  return {
    value: row.value,
    label: row.label,
    description: row.description,
    emoji: row.emoji,
    categoryId: row.category_id,
  };
}
