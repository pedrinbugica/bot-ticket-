import { Events } from "discord.js";
import { getCountingChannel, advanceCounting, resetCounting } from "../db/counting.js";

async function processMessage(msg) {
  if (msg.author.bot || !msg.guild) return;
  const config = getCountingChannel(msg.guild.id);
  if (!config || config.channel_id !== msg.channel.id) return;

  const trimmed = msg.content.trim();
  const num = Number(trimmed);

  if (!Number.isInteger(num) || String(num) !== trimmed) {
    await msg.delete().catch(() => null);
    return;
  }

  const expected = config.current_number + 1;

  if (msg.author.id === config.last_user_id) {
    await msg.delete().catch(() => null);
    const w = await msg.channel.send(`❌ ${msg.author}, você não pode contar duas vezes seguidas! Contagem em **${config.current_number}**.`);
    setTimeout(() => w.delete().catch(() => null), 6000);
    return;
  }

  if (num !== expected) {
    resetCounting(msg.guild.id);
    await msg.react("❌").catch(() => null);
    const w = await msg.channel.send(
      `💥 **${msg.author.displayName}** errou! Era **${expected}**, não ${num}.\nContagem resetada para 0. 📉${config.high_score > 0 ? ` Recorde: **${config.high_score}**` : ""}`
    );
    setTimeout(() => w.delete().catch(() => null), 8000);
    return;
  }

  advanceCounting(msg.guild.id, num, msg.author.id);
  await msg.react("✅").catch(() => null);

  if (num % 100 === 0) {
    await msg.channel.send(`🎉 **${num}!** Vocês chegaram a ${num}! Incrível! 🏆`).catch(() => null);
  }
}

export function registerCountingEvents(client) {
  client.on(Events.MessageCreate, (msg) => {
    processMessage(msg).catch((err) => console.error("counting error:", err));
  });
  console.log("Counting game ativo");
}
