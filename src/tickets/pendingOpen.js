const pending = new Map();
const TTL_MS = 10 * 60 * 1000;

function key(userId, guildId) {
  return `${userId}:${guildId}`;
}

export function setPendingOpen(userId, guildId, data) {
  pending.set(key(userId, guildId), { ...data, at: Date.now() });
}

export function takePendingOpen(userId, guildId) {
  const k = key(userId, guildId);
  const entry = pending.get(k);
  pending.delete(k);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry;
}
