const MAX_MESSAGES = 500;

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function collectMessages(channel) {
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

  return [...all.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function formatMessageLine(m) {
  const ts = m.createdAt.toISOString();
  const author = m.author?.tag ?? "desconhecido";
  const content = m.content?.trim() ? m.content : "(sem texto)";
  const embedNote = m.embeds.length ? ` [+${m.embeds.length} embed(s)]` : "";
  const attachNote = m.attachments.size
    ? ` [anexos: ${[...m.attachments.values()].map((a) => a.url).join(", ")}]`
    : "";
  return `[${ts}] ${author}: ${content}${embedNote}${attachNote}`;
}

export async function buildChannelTranscript(channel) {
  const sorted = await collectMessages(channel);
  const lines = sorted.map(formatMessageLine);
  const header = `Transcript — #${channel.name} (${channel.id})\nServidor: ${channel.guild?.name ?? "?"} (${channel.guild?.id ?? "?"})\nGerado em: ${new Date().toISOString()}\n${"=".repeat(60)}\n\n`;
  return header + (lines.length ? lines.join("\n") : "(Nenhuma mensagem registrada.)");
}

export async function buildChannelTranscriptHtml(channel) {
  const sorted = await collectMessages(channel);
  const rows = sorted
    .map((m) => {
      const content = m.content?.trim()
        ? escHtml(m.content)
        : "<em>(sem texto)</em>";
      return `<tr><td>${escHtml(m.createdAt.toISOString())}</td><td>${escHtml(m.author?.tag ?? "?")}</td><td>${content}</td></tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Transcript ${escHtml(channel.name)}</title>
<style>body{font-family:system-ui,sans-serif;background:#1e1f22;color:#dbdee1;padding:1rem}table{width:100%;border-collapse:collapse}td,th{border:1px solid #3f4147;padding:.5rem;text-align:left}th{background:#2b2d31}</style>
</head>
<body>
<h1>Transcript — #${escHtml(channel.name)}</h1>
<p>Servidor: ${escHtml(channel.guild?.name ?? "?")} · Gerado em ${escHtml(new Date().toISOString())}</p>
<table><thead><tr><th>Data</th><th>Autor</th><th>Mensagem</th></tr></thead>
<tbody>
${rows || '<tr><td colspan="3">Nenhuma mensagem</td></tr>'}
</tbody></table>
</body></html>`;
}
