const MAX_MESSAGES = 500;

/**
 * Coleta mensagens do canal (ordem cronológica) e devolve string UTF-8.
 */
export async function buildChannelTranscript(channel) {
  const all = new Map();
  let lastId = undefined;

  while (all.size < MAX_MESSAGES) {
    const batch = await channel.messages.fetch({
      limit: 100,
      before: lastId,
    });
    if (batch.size === 0) break;
    for (const m of batch.values()) all.set(m.id, m);
    lastId = batch.lastKey();
    if (batch.size < 100) break;
  }

  const sorted = [...all.values()].sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp
  );

  const lines = sorted.map((m) => {
    const ts = m.createdAt.toISOString();
    const author = m.author?.tag ?? "desconhecido";
    const content = m.content?.trim() ? m.content : "(sem texto)";
    const embedNote = m.embeds.length ? ` [+${m.embeds.length} embed(s)]` : "";
    const attachNote = m.attachments.size
      ? ` [anexos: ${[...m.attachments.values()].map((a) => a.url).join(", ")}]`
      : "";
    return `[${ts}] ${author}: ${content}${embedNote}${attachNote}`;
  });

  const header = `Transcript — #${channel.name} (${channel.id})\nServidor: ${channel.guild?.name ?? "?"} (${channel.guild?.id ?? "?"})\nGerado em: ${new Date().toISOString()}\n${"=".repeat(60)}\n\n`;
  return header + (lines.length ? lines.join("\n") : "(Nenhuma mensagem registrada.)");
}
