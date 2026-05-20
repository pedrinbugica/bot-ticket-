import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  insertRoleMenu, getRoleMenu, listRoleMenus, deleteRoleMenu,
  addRoleMenuOption, removeRoleMenuOption, listRoleMenuOptions,
  addReactionRole, getReactionRole, listReactionRoles, deleteReactionRole,
} from "../../db/roles.js";
import { publishOrUpdateRoleMenu } from "../../roles/roleMenu.js";

function hasManageGuild(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export async function handleRolesCommand(interaction) {
  const cmd = interaction.commandName;
  if (cmd !== "cargo-menu" && cmd !== "reaction-role") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!hasManageGuild(interaction)) {
    await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
    return true;
  }

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;

  // ── /cargo-menu ──────────────────────────────────────────────
  if (cmd === "cargo-menu") {
    if (sub === "criar") {
      const channel = interaction.options.getChannel("canal");
      const title = interaction.options.getString("titulo");
      const description = interaction.options.getString("descricao");
      const maxChoices = interaction.options.getInteger("max_cargos") ?? 0;

      const menuId = insertRoleMenu({ guildId: guild.id, channelId: channel.id, title, description, maxChoices });

      await interaction.editReply({
        content:
          `✅ Menu **#${menuId}** criado em ${channel}!\n` +
          `Use \`/cargo-menu opcao-adicionar menu_id:${menuId} cargo:@Cargo\` para adicionar opções.\n` +
          `O painel será publicado automaticamente ao adicionar a primeira opção.`,
      });
      return true;
    }

    if (sub === "opcao-adicionar") {
      const menuId = interaction.options.getInteger("menu_id");
      const role = interaction.options.getRole("cargo");
      const label = interaction.options.getString("label") ?? role.name;
      const emoji = interaction.options.getString("emoji");
      const description = interaction.options.getString("descricao");

      const menu = getRoleMenu(menuId);
      if (!menu || menu.guild_id !== guild.id) {
        await interaction.editReply({ content: `❌ Menu **#${menuId}** não encontrado neste servidor.` });
        return true;
      }

      try {
        addRoleMenuOption({ menuId, roleId: role.id, label, description, emoji });
      } catch (err) {
        await interaction.editReply({ content: `❌ ${err.message}` });
        return true;
      }

      await publishOrUpdateRoleMenu(menuId, guild);
      await interaction.editReply({ content: `✅ Cargo **${role.name}** adicionado ao menu **#${menuId}**.` });
      return true;
    }

    if (sub === "opcao-remover") {
      const menuId = interaction.options.getInteger("menu_id");
      const role = interaction.options.getRole("cargo");

      const menu = getRoleMenu(menuId);
      if (!menu || menu.guild_id !== guild.id) {
        await interaction.editReply({ content: `❌ Menu **#${menuId}** não encontrado.` });
        return true;
      }

      removeRoleMenuOption(menuId, role.id);
      await publishOrUpdateRoleMenu(menuId, guild);
      await interaction.editReply({ content: `✅ Cargo **${role.name}** removido do menu **#${menuId}**.` });
      return true;
    }

    if (sub === "remover") {
      const menuId = interaction.options.getInteger("menu_id");
      const menu = getRoleMenu(menuId);
      if (!menu || menu.guild_id !== guild.id) {
        await interaction.editReply({ content: `❌ Menu **#${menuId}** não encontrado.` });
        return true;
      }

      if (menu.message_id && menu.channel_id) {
        const ch = guild.channels.cache.get(menu.channel_id);
        if (ch) await ch.messages.delete(menu.message_id).catch(() => null);
      }

      deleteRoleMenu(menuId);
      await interaction.editReply({ content: `✅ Menu **#${menuId}** removido com sucesso.` });
      return true;
    }

    if (sub === "lista") {
      const menus = listRoleMenus(guild.id);
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("📋 Menus de cargo").setTimestamp();

      if (!menus.length) {
        embed.setDescription("Nenhum menu criado ainda. Use `/cargo-menu criar`.");
      } else {
        embed.setDescription(
          menus
            .map((m) => {
              const opts = listRoleMenuOptions(m.id);
              const status = m.message_id ? "✅ publicado" : "⏳ sem opções";
              return `**#${m.id}** — ${m.title} · ${opts.length} cargo(s) · ${status} · <#${m.channel_id}>`;
            })
            .join("\n")
        );
      }

      await interaction.editReply({ embeds: [embed] });
      return true;
    }
  }

  // ── /reaction-role ──────────────────────────────────────────
  if (cmd === "reaction-role") {
    if (sub === "adicionar") {
      const channel = interaction.options.getChannel("canal");
      const messageId = interaction.options.getString("mensagem_id").trim();
      const emoji = interaction.options.getString("emoji").trim();
      const role = interaction.options.getRole("cargo");

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        await interaction.editReply({ content: "❌ Mensagem não encontrada. Verifique o ID e o canal." });
        return true;
      }

      let rrId;
      try {
        rrId = addReactionRole({ guildId: guild.id, messageId, channelId: channel.id, emoji, roleId: role.id });
      } catch (err) {
        await interaction.editReply({ content: `❌ ${err.message}` });
        return true;
      }

      await message.react(emoji).catch(() => null);

      await interaction.editReply({
        content:
          `✅ Reaction role **#${rrId}** criada!\n` +
          `Reagir com ${emoji} em <#${channel.id}> dará o cargo **${role.name}**.`,
      });
      return true;
    }

    if (sub === "remover") {
      const id = interaction.options.getInteger("id");
      const rr = getReactionRole(id);
      if (!rr || rr.guild_id !== guild.id) {
        await interaction.editReply({ content: `❌ Reaction role **#${id}** não encontrada.` });
        return true;
      }

      deleteReactionRole(id);
      await interaction.editReply({ content: `✅ Reaction role **#${id}** removida.` });
      return true;
    }

    if (sub === "lista") {
      const rrs = listReactionRoles(guild.id);
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("⚡ Reaction roles").setTimestamp();

      if (!rrs.length) {
        embed.setDescription("Nenhuma reaction role configurada. Use `/reaction-role adicionar`.");
      } else {
        embed.setDescription(
          rrs.map((r) => `**#${r.id}** — ${r.emoji} → <@&${r.role_id}> em <#${r.channel_id}>`).join("\n")
        );
      }

      await interaction.editReply({ embeds: [embed] });
      return true;
    }
  }

  return false;
}
