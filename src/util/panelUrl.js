/** URL de imagem para embed do painel (http/https). Vazio = remover. */
export function normalizePanelImageUrl(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return s.slice(0, 500);
  } catch {
    return null;
  }
}
