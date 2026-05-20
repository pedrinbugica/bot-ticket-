import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import {
  getRoleMenu,
  listRoleMenuOptions,
  updateRoleMenuMessageId,
} from "../db/roles.js";

export function buildRoleMenuPayload(menu, options) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(menu.title)
    .setDescription(
      (menu.description ? menu.description + "\n\n" : "") +
        "_Use o menu abaixo para adicionar ou remover cargos. Selecionar um cargo que você já possui irá removê-lo._"
    );

  const maxValues = menu.max_choices > 0
    ? Math.min(menu.max_choices, options.length)
    : options.length;

  const select = new StringSelectMenuBuilder()
    .setCustomId(`role_menu:${menu.id}`)
    .setPlaceholder("Selecione seus cargos…")
    .setMinValues(0)
    .setMaxValues(Math.max(1, maxValues));

  for (const opt of options) {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel((opt.label || "Cargo").slice(0, 100))
      .setValue(opt.role_id)
      .setDescription((opt.description || `Cargo ID ${opt.role_id}`).slice(0, 100));
    if (opt.emoji) {
      try { option.setEmoji(opt.emoji); } catch { /* emoji inválido — ignora */ }
    }
    select.addOptions(option);
  }

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

export async function publishOrUpdateRoleMenu(menuId, guild) {
  const menu = getRoleMenu(menuId);
  if (!menu) return;

  const options = listRoleMenuOptions(menuId);
  if (!options.length) return;

  const payload = buildRoleMenuPayload(menu, options);

  const channel =
    guild.channels.cache.get(menu.channel_id) ??
    (await guild.channels.fetch(menu.channel_id).catch(() => null));
  if (!channel?.isTextBased()) return;

  if (menu.message_id) {
    const existing = await channel.messages.fetch(menu.message_id).catch(() => null);
    if (existing) {
      await existing.edit(payload).catch(() => null);
      return;
    }
  }

  const sent = await channel.send(payload).catch(() => null);
  if (sent) updateRoleMenuMessageId(menuId, sent.id);
}

export async function handleRoleMenuSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (!interaction.customId.startsWith("role_menu:")) return false;

  const menuId = parseInt(interaction.customId.split(":")[1], 10);
  if (!menuId) return false;

  const menu = getRoleMenu(menuId);
  if (!menu || menu.guild_id !== interaction.guild?.id) return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const options = listRoleMenuOptions(menuId);
  const menuRoleIds = new Set(options.map((o) => o.role_id));
  const selectedRoleIds = new Set(interaction.values);
  const member = interaction.member;

  const toAdd = [...selectedRoleIds].filter((id) => !member.roles.cache.has(id));
  const toRemove = [...menuRoleIds].filter(
    (id) => member.roles.cache.has(id) && !selectedRoleIds.has(id)
  );

  const addedNames = [];
  const removedNames = [];

  for (const roleId of toAdd) {
    const role = interaction.guild.roles.cache.get(roleId);
    if (role) {
      await member.roles.add(role).catch(() => null);
      addedNames.push(role.name);
    }
  }

  for (const roleId of toRemove) {
    const role = interaction.guild.roles.cache.get(roleId);
    if (role) {
      await member.roles.remove(role).catch(() => null);
      removedNames.push(role.name);
    }
  }

  const lines = [];
  if (addedNames.length) lines.push(`✅ Adicionado: **${addedNames.join(", ")}**`);
  if (removedNames.length) lines.push(`❌ Removido: **${removedNames.join(", ")}**`);
  if (!lines.length) lines.push("Nenhuma alteração de cargo realizada.");

  await interaction.editReply({ content: lines.join("\n") });
  return true;
}
