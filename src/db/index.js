import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "../config/env.js";

let db;

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(env.databasePath), { recursive: true });
  db = new Database(env.databasePath);
  db.pragma("journal_mode = WAL");
  runMigrations(db);
  return db;
}

function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      ticket_category_id TEXT,
      log_channel_id TEXT,
      support_role_ids TEXT NOT NULL DEFAULT '[]',
      panel_color INTEGER NOT NULL DEFAULT 5793266,
      panel_title TEXT NOT NULL DEFAULT 'Central de atendimento',
      panel_footer TEXT,
      panel_description TEXT,
      panel_rules TEXT NOT NULL DEFAULT '',
      ticket_counter INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ticket_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      value TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      emoji TEXT,
      category_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(guild_id, value)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      channel_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      opener_id TEXT NOT NULL,
      type_value TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      close_requested INTEGER NOT NULL DEFAULT 0,
      claimed_by TEXT,
      subject TEXT,
      form_body TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT,
      action TEXT NOT NULL,
      actor_id TEXT,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ticket_types_guild ON ticket_types(guild_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
    CREATE INDEX IF NOT EXISTS idx_ticket_events_guild ON ticket_events(guild_id);
  `);

  migrateGuildSettingsColumns(database);
  migrateInfractions(database);
  migrateLogSettings(database);
  migrateWelcomeSettings(database);
  migrateRoles(database);
  migrateAutomod(database);
  migrateGiveaways(database);
  migratePolls(database);
  migrateLeveling(database);
  migrateTags(database);
}

function migrateWelcomeSettings(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS welcome_settings (
      guild_id TEXT PRIMARY KEY,
      welcome_channel_id TEXT,
      welcome_message TEXT,
      goodbye_channel_id TEXT,
      goodbye_message TEXT,
      welcome_dm TEXT,
      auto_role_ids TEXT NOT NULL DEFAULT '[]'
    );
  `);
}

function migrateLogSettings(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS log_settings (
      guild_id TEXT PRIMARY KEY,
      log_channel_id TEXT,
      events_enabled TEXT NOT NULL DEFAULT '[]'
    );
  `);
}

function migrateInfractions(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS infractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_number INTEGER NOT NULL,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      mod_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      duration INTEGER,
      expires_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_infractions_guild ON infractions(guild_id);
    CREATE INDEX IF NOT EXISTS idx_infractions_user ON infractions(guild_id, user_id);
  `);
}

function migrateTags(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS custom_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      response TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      uses_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(guild_id, trigger)
    );

    CREATE TABLE IF NOT EXISTS tag_settings (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT NOT NULL DEFAULT '!'
    );

    CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
  `);
}

function migrateLeveling(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      last_xp_at TEXT,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS level_settings (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      levelup_channel_id TEXT,
      xp_per_message INTEGER NOT NULL DEFAULT 15,
      xp_cooldown_secs INTEGER NOT NULL DEFAULT 60
    );

    CREATE TABLE IF NOT EXISTS level_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      level_required INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      UNIQUE(guild_id, level_required)
    );

    CREATE INDEX IF NOT EXISTS idx_user_levels_guild ON user_levels(guild_id, xp DESC);
    CREATE INDEX IF NOT EXISTS idx_level_roles_guild ON level_roles(guild_id);
  `);
}

function migratePolls(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      option_index INTEGER NOT NULL,
      voted_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(poll_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_polls_guild ON polls(guild_id, status);
    CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
  `);
}

function migrateGiveaways(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      prize TEXT NOT NULL,
      winner_count INTEGER NOT NULL DEFAULT 1,
      ends_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      entered_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(giveaway_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_giveaways_guild ON giveaways(guild_id, status);
    CREATE INDEX IF NOT EXISTS idx_giveaway_entries_giveaway ON giveaway_entries(giveaway_id);
  `);
}

function migrateAutomod(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS automod_settings (
      guild_id TEXT PRIMARY KEY,
      word_filter_enabled INTEGER NOT NULL DEFAULT 0,
      word_filter_action TEXT NOT NULL DEFAULT 'delete',
      spam_enabled INTEGER NOT NULL DEFAULT 0,
      spam_msg_count INTEGER NOT NULL DEFAULT 5,
      spam_window_secs INTEGER NOT NULL DEFAULT 5,
      spam_action TEXT NOT NULL DEFAULT 'mute',
      mention_limit INTEGER NOT NULL DEFAULT 0,
      raid_enabled INTEGER NOT NULL DEFAULT 0,
      raid_join_count INTEGER NOT NULL DEFAULT 10,
      raid_window_secs INTEGER NOT NULL DEFAULT 30,
      link_filter_enabled INTEGER NOT NULL DEFAULT 0,
      exempt_role_ids TEXT NOT NULL DEFAULT '[]',
      exempt_channel_ids TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS bad_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      word TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'delete',
      UNIQUE(guild_id, word)
    );

    CREATE INDEX IF NOT EXISTS idx_bad_words_guild ON bad_words(guild_id);
  `);
}

function migrateRoles(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS role_menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      max_choices INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS role_menu_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      menu_id INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      label TEXT,
      description TEXT,
      emoji TEXT
    );

    CREATE TABLE IF NOT EXISTS reaction_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      role_id TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_role_menus_guild ON role_menus(guild_id);
    CREATE INDEX IF NOT EXISTS idx_role_menu_options_menu ON role_menu_options(menu_id);
    CREATE INDEX IF NOT EXISTS idx_reaction_roles_guild ON reaction_roles(guild_id);
  `);
}

function migrateGuildSettingsColumns(database) {
  const cols = new Set(
    database.prepare("PRAGMA table_info(guild_settings)").all().map((c) => c.name)
  );
  if (!cols.has("inactivity_hours")) {
    database.exec("ALTER TABLE guild_settings ADD COLUMN inactivity_hours INTEGER");
  }
  if (!cols.has("send_dm_on_close")) {
    database.exec("ALTER TABLE guild_settings ADD COLUMN send_dm_on_close INTEGER");
  }
  if (!cols.has("panel_image_url")) {
    database.exec("ALTER TABLE guild_settings ADD COLUMN panel_image_url TEXT");
  }
}
