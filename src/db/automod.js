import { getDb } from "./index.js";

const cache = new Map(); // guildId → { settings, words, ts }
const TTL = 30_000;

const DEFAULT_SETTINGS = {
  word_filter_enabled: 0,
  word_filter_action: "delete",
  spam_enabled: 0,
  spam_msg_count: 5,
  spam_window_secs: 5,
  spam_action: "mute",
  mention_limit: 0,
  raid_enabled: 0,
  raid_join_count: 10,
  raid_window_secs: 30,
  link_filter_enabled: 0,
  exempt_role_ids: "[]",
  exempt_channel_ids: "[]",
};

export function getAutomodSettings(guildId) {
  const now = Date.now();
  const cached = cache.get(guildId);
  if (cached && now - cached.ts < TTL) return cached;

  const row = getDb().prepare("SELECT * FROM automod_settings WHERE guild_id = ?").get(guildId);
  const settings = row ? row : { guild_id: guildId, ...DEFAULT_SETTINGS };

  const words = getDb()
    .prepare("SELECT word, severity FROM bad_words WHERE guild_id = ?")
    .all(guildId);

  const entry = { settings, words, ts: now };
  cache.set(guildId, entry);
  return entry;
}

export function invalidateAutomodCache(guildId) {
  cache.delete(guildId);
}

export function upsertAutomodSettings(guildId, patch) {
  const db = getDb();
  db.prepare("INSERT INTO automod_settings (guild_id) VALUES (?) ON CONFLICT(guild_id) DO NOTHING").run(guildId);

  const keys = Object.keys(patch);
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE automod_settings SET ${set} WHERE guild_id = ?`).run(...Object.values(patch), guildId);

  invalidateAutomodCache(guildId);
}

export function addBadWord(guildId, word, action = "delete") {
  const db = getDb();
  const lower = word.toLowerCase();

  const existing = db.prepare("SELECT id FROM bad_words WHERE guild_id = ? AND word = ?").get(guildId, lower);
  if (existing) throw new Error("Esta palavra já está na lista.");

  const { cnt } = db.prepare("SELECT COUNT(*) as cnt FROM bad_words WHERE guild_id = ?").get(guildId);
  if (cnt >= 200) throw new Error("Limite de 200 palavras atingido.");

  db.prepare("INSERT INTO bad_words (guild_id, word, severity) VALUES (?, ?, ?)").run(guildId, lower, action);
  invalidateAutomodCache(guildId);
}

export function removeBadWord(guildId, word) {
  getDb().prepare("DELETE FROM bad_words WHERE guild_id = ? AND word = ?").run(guildId, word.toLowerCase());
  invalidateAutomodCache(guildId);
}

export function listBadWords(guildId) {
  return getDb().prepare("SELECT * FROM bad_words WHERE guild_id = ? ORDER BY word").all(guildId);
}
