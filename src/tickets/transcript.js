const MAX_MESSAGES = 500;
const GROUP_THRESHOLD_MS = 7 * 60 * 1000;

const MONTH_PT = [
  "janeiro","fevereiro","março","abril","maio","junho",
  "julho","agosto","setembro","outubro","novembro","dezembro",
];

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(date) {
  return `${date.toLocaleDateString("pt-BR")} às ${formatTime(date)}`;
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return "Hoje";
  if (dayKey(date) === dayKey(yesterday)) return "Ontem";
  return `${date.getDate()} de ${MONTH_PT[date.getMonth()]} de ${date.getFullYear()}`;
}

function processMarkdown(raw) {
  if (!raw?.trim()) return "";
  let s = escHtml(raw);
  s = s.replace(/```(?:\w+\n)?([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`);
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*\*(.+?)\*\*\*/gs, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/gs, "<em>$1</em>");
  s = s.replace(/__(.+?)__/gs, "<u>$1</u>");
  s = s.replace(/_([^_]+)_/gs, "<em>$1</em>");
  s = s.replace(/~~(.+?)~~/gs, "<del>$1</del>");
  s = s.replace(/\|\|(.+?)\|\|/gs, `<span class="spoiler">$1</span>`);
  s = s.replace(/^&gt; ?(.+)/gm, "<blockquote>$1</blockquote>");
  s = s.replace(/\n/g, "<br>");
  return s;
}

function renderEmbed(embed) {
  const color = embed.color != null
    ? "#" + embed.color.toString(16).padStart(6, "0")
    : "#5865f2";
  const parts = [];
  if (embed.title) parts.push(`<div class="embed-title">${escHtml(embed.title)}</div>`);
  if (embed.description) parts.push(`<div class="embed-desc">${processMarkdown(embed.description)}</div>`);
  if (embed.fields?.length) {
    const fieldsHtml = embed.fields.map(f =>
      `<div class="embed-field${f.inline ? " inline" : ""}">
        <div class="embed-fn">${escHtml(f.name)}</div>
        <div class="embed-fv">${processMarkdown(f.value)}</div>
      </div>`
    ).join("");
    parts.push(`<div class="embed-fields">${fieldsHtml}</div>`);
  }
  if (embed.footer?.text) parts.push(`<div class="embed-footer">${escHtml(embed.footer.text)}</div>`);
  if (!parts.length) return "";
  return `<div class="embed" style="border-left-color:${color}">${parts.join("")}</div>`;
}

function renderAttachment(att) {
  const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name ?? att.url ?? "");
  if (isImage) {
    return `<div class="attachment"><img src="${escHtml(att.url)}" alt="${escHtml(att.name ?? "imagem")}" loading="lazy"></div>`;
  }
  return `<div class="attachment"><a href="${escHtml(att.url)}" target="_blank" rel="noreferrer">📎 ${escHtml(att.name ?? att.url)}</a></div>`;
}

async function collectMessages(channel) {
  const all = new Map();
  let lastId;
  while (all.size < MAX_MESSAGES) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });
    if (!batch.size) break;
    for (const m of batch.values()) all.set(m.id, m);
    lastId = batch.lastKey();
    if (batch.size < 100) break;
  }
  return [...all.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function buildMessagesHtml(msgs) {
  let html = "";
  let lastDay = null;
  let lastAuthorId = null;
  let lastTimestamp = 0;

  for (const m of msgs) {
    const date = m.createdAt;
    const dk = dayKey(date);

    if (dk !== lastDay) {
      html += `<div class="day-sep">${escHtml(dayLabel(date))}</div>`;
      lastDay = dk;
      lastAuthorId = null;
    }

    const sameAuthor = m.author?.id === lastAuthorId;
    const withinThreshold = (m.createdTimestamp - lastTimestamp) < GROUP_THRESHOLD_MS;
    const isContinuation = sameAuthor && withinThreshold;
    const isBot = m.author?.bot ?? false;
    const avatarUrl = m.author?.displayAvatarURL?.({ size: 64, extension: "webp" }) ?? null;

    let body = "";
    if (m.content?.trim()) body += `<div class="msg-text">${processMarkdown(m.content)}</div>`;
    for (const embed of (m.embeds ?? [])) body += renderEmbed(embed);
    for (const [, att] of (m.attachments ?? [])) body += renderAttachment(att);
    if (!body) body = `<div class="msg-text empty">(sem conteúdo)</div>`;

    if (!isContinuation) {
      const username = escHtml(m.author?.username ?? m.author?.tag ?? "Desconhecido");
      const avatarHtml = avatarUrl
        ? `<img class="avatar" src="${escHtml(avatarUrl)}" alt="">`
        : `<div class="avatar-default">${escHtml((m.author?.username ?? "?")[0].toUpperCase())}</div>`;
      const botBadge = isBot ? ` <span class="bot-badge">BOT</span>` : "";
      html += `
        <div class="msg-group first">
          ${avatarHtml}
          <div class="msg-content">
            <div class="msg-header">
              <span class="msg-author${isBot ? " bot" : ""}">${username}${botBadge}</span>
              <span class="msg-time">${formatDateTime(date)}</span>
            </div>
            ${body}
          </div>
        </div>`;
    } else {
      html += `
        <div class="msg-group cont">
          <div class="msg-side-time">${formatTime(date)}</div>
          <div class="msg-content">${body}</div>
        </div>`;
    }

    lastAuthorId = m.author?.id ?? null;
    lastTimestamp = m.createdTimestamp;
  }
  return html;
}

export async function buildChannelTranscript(channel) {
  const msgs = await collectMessages(channel);
  const lines = msgs.map((m) => {
    const ts = m.createdAt.toISOString();
    const author = m.author?.tag ?? "desconhecido";
    const content = m.content?.trim() || "(sem texto)";
    const embedNote = m.embeds.length ? ` [+${m.embeds.length} embed(s)]` : "";
    const attachNote = m.attachments.size
      ? ` [anexos: ${[...m.attachments.values()].map((a) => a.url).join(", ")}]`
      : "";
    return `[${ts}] ${author}: ${content}${embedNote}${attachNote}`;
  });
  const header = `Transcript — #${channel.name} (${channel.id})\nServidor: ${channel.guild?.name ?? "?"} (${channel.guild?.id ?? "?"})\nGerado em: ${new Date().toISOString()}\n${"=".repeat(60)}\n\n`;
  return header + (lines.length ? lines.join("\n") : "(Nenhuma mensagem registrada.)");
}

export async function buildChannelTranscriptHtml(channel, info = {}) {
  const { opener, closer, typeLabel, durationLabel, closeReason } = info;
  const msgs = await collectMessages(channel);
  const messagesHtml = buildMessagesHtml(msgs);
  const guildName = channel.guild?.name ?? "Servidor";
  const channelName = channel.name;

  const infoItems = [
    opener    ? { label: "Aberto por",  value: opener.user?.tag ?? opener.user?.username ?? String(opener) } : null,
    closer    ? { label: "Fechado por", value: closer.tag ?? closer.username ?? String(closer) } : null,
    typeLabel ? { label: "Tipo",        value: typeLabel } : null,
    durationLabel ? { label: "Duração", value: durationLabel } : null,
    closeReason   ? { label: "Motivo",  value: closeReason } : null,
    { label: "Mensagens", value: String(msgs.length) },
  ].filter(Boolean);

  const infoHtml = infoItems.map(i =>
    `<div class="info-item">
      <div class="info-label">${escHtml(i.label)}</div>
      <div class="info-value">${escHtml(i.value)}</div>
    </div>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript — #${escHtml(channelName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"gg sans","Noto Sans","Helvetica Neue",Helvetica,Arial,sans-serif;background:#313338;color:#dbdee1;font-size:16px;line-height:1.375}
.header{background:#1e1f22;padding:20px 24px;border-bottom:3px solid #5865f2;display:flex;align-items:center;gap:14px}
.header-icon{font-size:32px}
.header-text h1{font-size:22px;font-weight:700;color:#f2f3f5}
.header-text p{font-size:13px;color:#949ba4;margin-top:4px}
.ticket-info{background:#2b2d31;padding:14px 24px;border-bottom:1px solid #1e1f22;display:flex;flex-wrap:wrap;gap:24px}
.info-item{display:flex;flex-direction:column;gap:3px}
.info-label{color:#949ba4;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px}
.info-value{color:#f2f3f5;font-size:14px}
.messages{padding:8px 0 32px}
.day-sep{display:flex;align-items:center;gap:8px;padding:20px 24px;color:#949ba4;font-size:12px;font-weight:600}
.day-sep::before,.day-sep::after{content:"";flex:1;height:1px;background:#3f4147}
.msg-group{display:flex;padding:2px 24px;border-radius:4px}
.msg-group:hover{background:rgba(4,4,5,.07)}
.msg-group.first{margin-top:16px;align-items:flex-start}
.avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;margin-right:16px;margin-top:2px;object-fit:cover}
.avatar-default{width:40px;height:40px;border-radius:50%;flex-shrink:0;margin-right:16px;margin-top:2px;background:#5865f2;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff}
.msg-side-time{width:40px;font-size:10px;color:transparent;text-align:right;flex-shrink:0;margin-right:16px;padding-top:3px;transition:color .1s}
.msg-group.cont:hover .msg-side-time{color:#949ba4}
.msg-content{flex:1;min-width:0}
.msg-header{display:flex;align-items:baseline;gap:8px;margin-bottom:4px;flex-wrap:wrap}
.msg-author{font-weight:600;color:#f2f3f5;font-size:16px}
.msg-author.bot{color:#7289da}
.bot-badge{background:#5865f2;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;vertical-align:middle;margin-left:2px}
.msg-time{font-size:11px;color:#949ba4}
.msg-text{color:#dbdee1;word-wrap:break-word;white-space:pre-wrap}
.msg-text.empty{color:#4e5058;font-style:italic}
code{background:#1e1f22;border-radius:3px;padding:1px 5px;font-family:Consolas,"Courier New",monospace;font-size:14px}
pre{background:#1e1f22;border-radius:4px;padding:10px 14px;margin:6px 0;overflow-x:auto}
pre code{background:none;padding:0;font-size:13px}
blockquote{border-left:4px solid #4e5058;padding-left:12px;margin:4px 0;color:#b5bac1}
strong{font-weight:700}
em{font-style:italic}
del{text-decoration:line-through}
u{text-decoration:underline}
.spoiler{background:#202225;border-radius:3px;padding:0 3px;color:#202225;cursor:pointer}
.spoiler:hover{color:#dbdee1}
.embed{margin-top:6px;border-left:4px solid #5865f2;background:#2b2d31;border-radius:0 4px 4px 0;padding:10px 14px;max-width:520px}
.embed-title{font-weight:700;color:#f2f3f5;margin-bottom:6px;font-size:15px}
.embed-desc{font-size:14px;color:#dbdee1;line-height:1.4;margin-bottom:6px}
.embed-fields{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.embed-field{flex:0 0 100%}
.embed-field.inline{flex:0 0 calc(50% - 4px)}
.embed-fn{font-size:13px;font-weight:700;color:#f2f3f5;margin-bottom:2px}
.embed-fv{font-size:13px;color:#dbdee1}
.embed-footer{font-size:12px;color:#949ba4;margin-top:10px;padding-top:8px;border-top:1px solid #3f4147}
.attachment{margin-top:6px}
.attachment img{max-width:400px;max-height:300px;border-radius:4px;display:block}
.attachment a{color:#00aff4;text-decoration:none;font-size:14px}
.attachment a:hover{text-decoration:underline}
.footer{padding:20px 24px;border-top:1px solid #3f4147;color:#4e5058;font-size:12px;text-align:center}
</style>
</head>
<body>
<div class="header">
  <div class="header-icon">🎫</div>
  <div class="header-text">
    <h1>#${escHtml(channelName)}</h1>
    <p>${escHtml(guildName)} · ${msgs.length} mensagem${msgs.length !== 1 ? "s" : ""}</p>
  </div>
</div>
<div class="ticket-info">${infoHtml}</div>
<div class="messages">${messagesHtml || '<div style="padding:32px;color:#4e5058;text-align:center">Nenhuma mensagem registrada.</div>'}</div>
<div class="footer">Transcript gerado em ${escHtml(new Date().toLocaleString("pt-BR"))} · Bot de Administração</div>
</body>
</html>`;
}
