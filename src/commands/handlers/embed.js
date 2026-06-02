import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

const MODAL_PREFIX = "embed_modal:";

export async function handleEmbedCommand(interaction) {
  if (interaction.commandName !== "embed") return false;

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "❌ Você precisa da permissão **Gerenciar mensagens**.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const channel = interaction.options.getChannel("canal") ?? interaction.channel;

  const modal = new ModalBuilder()
    .setCustomId(`${MODAL_PREFIX}${channel.id}`)
    .setTitle("✏️ Criar Embed");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("titulo").setLabel("Título").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("descricao").setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("cor").setLabel("Cor (ex: #5865F2)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(7).setPlaceholder("#5865F2")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("rodape").setLabel("Rodapé (opcional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(2048)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId("imagem").setLabel("URL da imagem (opcional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(500)
    )
  );

  await interaction.showModal(modal);
  return true;
}

export async function handleEmbedModal(interaction) {
  if (!interaction.customId.startsWith(MODAL_PREFIX)) return false;

  const channelId = interaction.customId.slice(MODAL_PREFIX.length);
  const channel = interaction.guild.channels.cache.get(channelId)
    ?? await interaction.guild.channels.fetch(channelId).catch(() => null);

  if (!channel?.isTextBased()) {
    await interaction.reply({ content: "❌ Canal não encontrado.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const titulo   = interaction.fields.getTextInputValue("titulo");
  const descricao = interaction.fields.getTextInputValue("descricao");
  const corRaw   = interaction.fields.getTextInputValue("cor").trim().replace("#", "");
  const rodape   = interaction.fields.getTextInputValue("rodape").trim();
  const imagem   = interaction.fields.getTextInputValue("imagem").trim();

  const colorNum = corRaw ? parseInt(corRaw, 16) : NaN;
  const color = !isNaN(colorNum) && colorNum >= 0 && colorNum <= 0xffffff ? colorNum : 0x5865f2;

  const embed = new EmbedBuilder().setColor(color).setTitle(titulo).setDescription(descricao).setTimestamp();
  if (rodape) embed.setFooter({ text: rodape });
  if (imagem) embed.setImage(imagem);

  const sent = await channel.send({ embeds: [embed] }).catch(() => null);
  if (!sent) {
    await interaction.reply({ content: "❌ Não consegui enviar o embed nesse canal. Verifique minhas permissões.", flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.reply({ content: `✅ Embed enviado em ${channel}!`, flags: MessageFlags.Ephemeral });
  return true;
}
