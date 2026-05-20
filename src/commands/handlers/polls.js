import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import { getPoll, listActivePolls, getVoteCounts, getTotalVotes } from "../../db/polls.js";
import { createPoll, finishPoll } from "../../polls/polls.js";

function hasPerm(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
}

export async function handlePollsCommand(interaction, client) {
  if (interaction.commandName !== "enquete") return false;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!hasPerm(interaction)) {
    await interaction.editReply({ content: "❌ Você precisa da permissão **Gerenciar servidor**." });
    return true;
  }

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;

  if (sub === "criar") {
    const question = interaction.options.getString("pergunta");
    const durationStr = interaction.options.getString("duracao");
    const channel = interaction.options.getChannel("canal") ?? interaction.channel;

    const options = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`opcao${i}`);
      if (opt) options.push(opt.trim());
    }

    try {
      const id = await createPoll({
        guild,
        channel,
        question,
        options,
        durationStr,
        createdBy: interaction.user.id,
      });
      await interaction.editReply({ content: `✅ Enquete **#${id}** criada em ${channel}! 📊` });
    } catch (err) {
      await interaction.editReply({ content: `❌ ${err.message}` });
    }
    return true;
  }

  if (sub === "encerrar") {
    const id = interaction.options.getInteger("id");
    const poll = getPoll(id);

    if (!poll || poll.guild_id !== guild.id) {
      await interaction.editReply({ content: `❌ Enquete **#${id}** não encontrada neste servidor.` });
      return true;
    }
    if (poll.status !== "active") {
      await interaction.editReply({ content: `❌ Enquete **#${id}** já está encerrada.` });
      return true;
    }

    await finishPoll(poll, client);
    await interaction.editReply({ content: `✅ Enquete **#${id}** encerrada e resultado publicado.` });
    return true;
  }

  if (sub === "lista") {
    const polls = listActivePolls(guild.id);
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("📊 Enquetes ativas").setTimestamp();

    if (!polls.length) {
      embed.setDescription("Nenhuma enquete ativa. Use `/enquete criar` para começar.");
    } else {
      embed.setDescription(
        polls
          .map((p) => {
            const ts = Math.floor(new Date(p.ends_at).getTime() / 1000);
            const total = getTotalVotes(p.id);
            const opts = JSON.parse(p.options).length;
            return `**#${p.id}** — ${p.question} · ${opts} opções · ${total} voto(s) · encerra <t:${ts}:R>`;
          })
          .join("\n")
      );
    }

    await interaction.editReply({ embeds: [embed] });
    return true;
  }

  return false;
}
