import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getGiveaway, listActiveGiveaways, getEntryCount } from "../../db/giveaway.js";
import { createGiveaway, finishGiveaway, rerollGiveaway } from "../../giveaway/giveaway.js";

function hasPerm(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export async function handleGiveawayCommand(interaction, client) {
  if (interaction.commandName !== "sorteio") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!hasPerm(interaction)) {
    await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
    return true;
  }

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;

  if (sub === "criar") {
    const prize = interaction.options.getString("premio");
    const durationStr = interaction.options.getString("duracao");
    const winnerCount = interaction.options.getInteger("vencedores") ?? 1;
    const channel = interaction.options.getChannel("canal") ?? interaction.channel;

    try {
      const id = await createGiveaway({
        guild,
        channel,
        prize,
        durationStr,
        winnerCount,
        createdBy: interaction.user.id,
      });
      await interaction.editReply({ content: `✅ Sorteio **#${id}** criado em ${channel}! 🎉` });
    } catch (err) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return true;
  }

  if (sub === "encerrar") {
    const id = interaction.options.getInteger("id");
    const giveaway = getGiveaway(id);

    if (!giveaway || giveaway.guild_id !== guild.id) {
      await interaction.editReply({ content: `❌ Sorteio **#${id}** não encontrado neste servidor.` });
      return true;
    }
    if (giveaway.status !== "active") {
      await interaction.editReply({ content: `❌ Sorteio **#${id}** já está encerrado.` });
      return true;
    }

    await finishGiveaway(giveaway, client);
    await interaction.editReply({ content: `✅ Sorteio **#${id}** encerrado e vencedores anunciados.` });
    return true;
  }

  if (sub === "reroll") {
    const id = interaction.options.getInteger("id");
    const qty = interaction.options.getInteger("vencedores") ?? 1;
    const giveaway = getGiveaway(id);

    if (!giveaway || giveaway.guild_id !== guild.id) {
      await interaction.editReply({ content: `❌ Sorteio **#${id}** não encontrado neste servidor.` });
      return true;
    }
    if (giveaway.status !== "ended") {
      await interaction.editReply({ content: `❌ O sorteio **#${id}** ainda está ativo. Encerre-o primeiro.` });
      return true;
    }

    const winners = await rerollGiveaway(giveaway, qty, client);
    if (!winners.length) {
      await interaction.editReply({ content: `❌ Nenhum participante registrado no sorteio **#${id}**.` });
    } else {
      await interaction.editReply({
        content: `✅ Reroll feito! Novos vencedores: ${winners.map((id) => `<@${id}>`).join(", ")}.`,
      });
    }
    return true;
  }

  if (sub === "lista") {
    const giveaways = listActiveGiveaways(guild.id);
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("🎉 Sorteios ativos").setTimestamp();

    if (!giveaways.length) {
      embed.setDescription("Nenhum sorteio ativo. Use `/sorteio criar` para começar.");
    } else {
      embed.setDescription(
        giveaways
          .map((g) => {
            const ts = Math.floor(new Date(g.ends_at).getTime() / 1000);
            const cnt = getEntryCount(g.id);
            return `**#${g.id}** — ${g.prize} · ${g.winner_count} vencedor(es) · encerra <t:${ts}:R> · ${cnt} participante(s)`;
          })
          .join("\n")
      );
    }

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  return false;
}
