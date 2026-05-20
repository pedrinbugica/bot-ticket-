import { getDb } from "./index.js";

// ---- role_menus ----

export function insertRoleMenu({ guildId, channelId, title, description, maxChoices }) {
  const result = getDb()
    .prepare(
      `INSERT INTO role_menus (guild_id, channel_id, title, description, max_choices, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(guildId, channelId, title, description ?? null, maxChoices ?? 0);
  return result.lastInsertRowid;
}

export function getRoleMenu(menuId) {
  return getDb().prepare("SELECT * FROM role_menus WHERE id = ?").get(menuId) ?? null;
}

export function listRoleMenus(guildId) {
  return getDb().prepare("SELECT * FROM role_menus WHERE guild_id = ? ORDER BY id").all(guildId);
}

export function updateRoleMenuMessageId(menuId, messageId) {
  getDb().prepare("UPDATE role_menus SET message_id = ? WHERE id = ?").run(messageId, menuId);
}

export function deleteRoleMenu(menuId) {
  const db = getDb();
  db.prepare("DELETE FROM role_menu_options WHERE menu_id = ?").run(menuId);
  db.prepare("DELETE FROM role_menus WHERE id = ?").run(menuId);
}

// ---- role_menu_options ----

export function addRoleMenuOption({ menuId, roleId, label, description, emoji }) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM role_menu_options WHERE menu_id = ? AND role_id = ?")
    .get(menuId, roleId);
  if (existing) throw new Error("Este cargo já está neste menu.");

  const { cnt } = db.prepare("SELECT COUNT(*) as cnt FROM role_menu_options WHERE menu_id = ?").get(menuId);
  if (cnt >= 25) throw new Error("Limite de 25 opções por menu atingido.");

  db.prepare(
    "INSERT INTO role_menu_options (menu_id, role_id, label, description, emoji) VALUES (?, ?, ?, ?, ?)"
  ).run(menuId, roleId, label ?? null, description ?? null, emoji ?? null);
}

export function removeRoleMenuOption(menuId, roleId) {
  getDb().prepare("DELETE FROM role_menu_options WHERE menu_id = ? AND role_id = ?").run(menuId, roleId);
}

export function listRoleMenuOptions(menuId) {
  return getDb().prepare("SELECT * FROM role_menu_options WHERE menu_id = ? ORDER BY id").all(menuId);
}

// ---- reaction_roles ----

export function addReactionRole({ guildId, messageId, channelId, emoji, roleId }) {
  const existing = getDb()
    .prepare("SELECT id FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?")
    .get(guildId, messageId, emoji);
  if (existing) throw new Error("Já existe uma reaction role com este emoji nesta mensagem.");

  const result = getDb()
    .prepare(
      "INSERT INTO reaction_roles (guild_id, message_id, channel_id, emoji, role_id) VALUES (?, ?, ?, ?, ?)"
    )
    .run(guildId, messageId, channelId, emoji, roleId);
  return result.lastInsertRowid;
}

export function getReactionRole(id) {
  return getDb().prepare("SELECT * FROM reaction_roles WHERE id = ?").get(id) ?? null;
}

export function getReactionRoleByEmoji(guildId, messageId, emoji) {
  return getDb()
    .prepare("SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?")
    .get(guildId, messageId, emoji) ?? null;
}

export function listReactionRoles(guildId) {
  return getDb().prepare("SELECT * FROM reaction_roles WHERE guild_id = ? ORDER BY id").all(guildId);
}

export function deleteReactionRole(id) {
  getDb().prepare("DELETE FROM reaction_roles WHERE id = ?").run(id);
}
