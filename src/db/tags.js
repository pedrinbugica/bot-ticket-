import { getDb } from "./index.js";

export function getTag(guildId, trigger) {
  return (
    getDb()
      .prepare("SELECT * FROM custom_commands WHERE guild_id = ? AND trigger = ?")
      .get(guildId, trigger.toLowerCase()) ?? null
  );
}

export function createTag(guildId, trigger, response, creatorId) {
  const db = getDb();
  const lower = trigger.toLowerCase();

  const existing = db
    .prepare("SELECT id FROM custom_commands WHERE guild_id = ? AND trigger = ?")
    .get(guildId, lower);
  if (existing) throw new Error(`A tag \`${lower}\` já existe neste servidor.`);

  const { cnt } = db
    .prepare("SELECT COUNT(*) as cnt FROM custom_commands WHERE guild_id = ?")
    .get(guildId);
  if (cnt >= 100) throw new Error("Limite de 100 tags por servidor atingido.");

  db.prepare(
    "INSERT INTO custom_commands (guild_id, trigger, response, creator_id, created_at) VALUES (?, ?, ?, ?, datetime('now'))"
  ).run(guildId, lower, response, creatorId);
}

export function editTag(guildId, trigger, response) {
  const db = getDb();
  const lower = trigger.toLowerCase();
  const existing = db
    .prepare("SELECT id FROM custom_commands WHERE guild_id = ? AND trigger = ?")
    .get(guildId, lower);
  if (!existing) throw new Error(`A tag \`${lower}\` não existe neste servidor.`);
  db.prepare("UPDATE custom_commands SET response = ? WHERE guild_id = ? AND trigger = ?").run(
    response,
    guildId,
    lower
  );
}

export function deleteTag(guildId, trigger) {
  getDb()
    .prepare("DELETE FROM custom_commands WHERE guild_id = ? AND trigger = ?")
    .run(guildId, trigger.toLowerCase());
}

export function listTags(guildId) {
  return getDb()
    .prepare("SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY trigger")
    .all(guildId);
}

export function incrementTagUse(guildId, trigger) {
  getDb()
    .prepare(
      "UPDATE custom_commands SET uses_count = uses_count + 1 WHERE guild_id = ? AND trigger = ?"
    )
    .run(guildId, trigger.toLowerCase());
}

export function getTagSettings(guildId) {
  return (
    getDb().prepare("SELECT * FROM tag_settings WHERE guild_id = ?").get(guildId) ?? {
      guild_id: guildId,
      prefix: "!",
    }
  );
}

export function setTagPrefix(guildId, prefix) {
  getDb()
    .prepare(
      "INSERT INTO tag_settings (guild_id, prefix) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET prefix = excluded.prefix"
    )
    .run(guildId, prefix);
}
