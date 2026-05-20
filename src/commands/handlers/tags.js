import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  getTag,
  createTag,
  editTag,
  deleteTag,
  listTags,
  getTagSettings,
  setTagPrefix,
} from "../../db/tags.js";

const VALID_NAME = /^[a-z0-9_-]{1,32}$/;

function hasPerm(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export async function handleTagsCommand(interaction) {
  if (interaction.commandName !== "tag") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guild.id;
  const settings = getTagSettings(guildId);
  const prefix = settings.prefix ?? "!";

  if (sub === "criar") {
    if (!hasPerm(interaction)) {
      await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
      return true;
    }

    const name = interaction.options.getString("nome").toLowerCase().trim();
    const content = interaction.options.getString("conteudo");

    if (!VALID_NAME.test(name)) {
      await interaction.editReply({
        content: "❌ Nome inválido. Use apenas letras minúsculas, números, `-` ou `_` (máx. 32 caracteres).",
      });
      return true;
    }

    try {
      createTag(guildId, name, content, interaction.user.id);
      await interaction.editReply({
        content: `✅ Tag \`${prefix}${name}\` criada! Qualquer membro pode usá-la digitando \`${prefix}${name}\` no chat.`,
      });
    } catch (err) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return true;
  }

  if (sub === "editar") {
    if (!hasPerm(interaction)) {
      await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
      return true;
    }

    const name = interaction.options.getString("nome").toLowerCase().trim();
    const content = interaction.options.getString("conteudo");

    try {
      editTag(guildId, name, content);
      await interaction.editReply({ content: `✅ Tag \`${prefix}${name}\` atualizada com sucesso.` });
    } catch (err) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return true;
  }

  if (sub === "remover") {
    if (!hasPerm(interaction)) {
      await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
      return true;
    }

    const name = interaction.options.getString("nome").toLowerCase().trim();
    const tag = getTag(guildId, name);
    if (!tag) {
      await interaction.editReply({ content: `❌ Tag \`${name}\` não encontrada neste servidor.` });
      return true;
    }

    deleteTag(guildId, name);
    await interaction.editReply({ content: `✅ Tag \`${prefix}${name}\` removida.` });
    return true;
  }

  if (sub === "lista") {
    const tags = listTags(guildId);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏷️ Tags do servidor")
      .setTimestamp();

    if (!tags.length) {
      embed
        .setDescription(`Nenhuma tag criada ainda. Use \`/tag criar\` para começar.`)
        .setFooter({ text: `Prefixo: ${prefix}` });
    } else {
      const lines = tags.map(
        (t) => `\`${prefix}${t.trigger}\` — usada **${t.uses_count}x**`
      );
      embed
        .setDescription(lines.join("\n").slice(0, 4000))
        .setFooter({ text: `${tags.length} tag(s) · Prefixo: ${prefix}` });
    }

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  if (sub === "ver") {
    const name = interaction.options.getString("nome").toLowerCase().trim();
    const tag = getTag(guildId, name);

    if (!tag) {
      await interaction.editReply({ content: `❌ Tag \`${name}\` não encontrada neste servidor.` });
      return true;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏷️ ${prefix}${tag.trigger}`)
      .setDescription(tag.response.slice(0, 4000))
      .addFields({ name: "Usos totais", value: `${tag.uses_count}`, inline: true })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  if (sub === "prefixo") {
    if (!hasPerm(interaction)) {
      await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
      return true;
    }

    const newPrefix = interaction.options.getString("prefixo").trim();
    if (newPrefix.length === 0 || newPrefix.length > 5) {
      await interaction.editReply({ content: "❌ O prefixo deve ter entre 1 e 5 caracteres." });
      return true;
    }

    setTagPrefix(guildId, newPrefix);
    await interaction.editReply({
      content: `✅ Prefixo alterado para \`${newPrefix}\`. Membros agora usam \`${newPrefix}nome-da-tag\` no chat.`,
    });
    return true;
  }

  return false;
}
