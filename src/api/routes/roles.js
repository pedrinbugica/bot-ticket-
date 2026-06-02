import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listRoleMenus, insertRoleMenu, deleteRoleMenu,
  listRoleMenuOptions, addRoleMenuOption, removeRoleMenuOption,
  listReactionRoles, addReactionRole, deleteReactionRole,
} from "../../db/roles.js";

const router = Router();

// GET /api/guilds/:guildId/modules/roles
router.get("/:guildId/modules/roles", requireAuth, (req, res) => {
  const { guildId } = req.params;
  try {
    const menus = listRoleMenus(guildId).map((menu) => ({
      ...menu,
      options: listRoleMenuOptions(menu.id),
    }));
    const reactionRoles = listReactionRoles(guildId);
    res.json({ menus, reactionRoles });
  } catch (err) {
    console.error("[roles] Erro:", err);
    res.status(500).json({ error: "Erro ao buscar cargos." });
  }
});

// POST /api/guilds/:guildId/modules/roles/menus
router.post("/:guildId/modules/roles/menus", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { channelId, title, description, maxChoices } = req.body;
  if (!channelId || !title) return res.status(400).json({ error: "channelId e title obrigatórios." });
  try {
    const id = insertRoleMenu({ guildId, channelId, title, description: description ?? null, maxChoices: maxChoices ?? 0 });
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar menu." });
  }
});

// DELETE /api/guilds/:guildId/modules/roles/menus/:menuId
router.delete("/:guildId/modules/roles/menus/:menuId", requireAuth, (req, res) => {
  const { menuId } = req.params;
  try {
    deleteRoleMenu(Number(menuId));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover menu." });
  }
});

// POST /api/guilds/:guildId/modules/roles/menus/:menuId/options
router.post("/:guildId/modules/roles/menus/:menuId/options", requireAuth, (req, res) => {
  const { menuId } = req.params;
  const { roleId, label, description, emoji } = req.body;
  if (!roleId) return res.status(400).json({ error: "roleId obrigatório." });
  try {
    addRoleMenuOption({ menuId: Number(menuId), roleId, label: label ?? null, description: description ?? null, emoji: emoji ?? null });
    res.json({ ok: true, options: listRoleMenuOptions(Number(menuId)) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/guilds/:guildId/modules/roles/menus/:menuId/options/:roleId
router.delete("/:guildId/modules/roles/menus/:menuId/options/:roleId", requireAuth, (req, res) => {
  const { menuId, roleId } = req.params;
  try {
    removeRoleMenuOption(Number(menuId), roleId);
    res.json({ ok: true, options: listRoleMenuOptions(Number(menuId)) });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover opção." });
  }
});

// POST /api/guilds/:guildId/modules/roles/reaction-roles
router.post("/:guildId/modules/roles/reaction-roles", requireAuth, (req, res) => {
  const { guildId } = req.params;
  const { messageId, channelId, emoji, roleId } = req.body;
  if (!messageId || !channelId || !emoji || !roleId)
    return res.status(400).json({ error: "messageId, channelId, emoji e roleId obrigatórios." });
  try {
    const id = addReactionRole({ guildId, messageId, channelId, emoji, roleId });
    res.json({ ok: true, id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/guilds/:guildId/modules/roles/reaction-roles/:id
router.delete("/:guildId/modules/roles/reaction-roles/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  try {
    deleteReactionRole(Number(id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover reaction role." });
  }
});

export default router;
