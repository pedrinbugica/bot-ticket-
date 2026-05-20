import { getDb } from "./index.js";

export function getGuildSettingsRow(guildId) {
  return getDb().prepare("SELECT * FROM guild_settings WHERE guild_id = ?").get(guildId);
}

export function upsertGuildSettings(guildId, patch) {
  const existing = getGuildSettingsRow(guildId);
  const merged = {
    ticket_category_id: patch.ticket_category_id ?? existing?.ticket_category_id ?? null,
    log_channel_id: patch.log_channel_id ?? existing?.log_channel_id ?? null,
    support_role_ids:
      patch.support_role_ids !== undefined
        ? JSON.stringify(patch.support_role_ids)
        : existing?.support_role_ids ?? "[]",
    panel_color: patch.panel_color ?? existing?.panel_color ?? 5793266,
    panel_title: patch.panel_title ?? existing?.panel_title ?? "Central de atendimento",
    panel_footer:
      patch.panel_footer !== undefined
        ? patch.panel_footer
        : (existing?.panel_footer ?? null),
    panel_description:
      patch.panel_description !== undefined
        ? patch.panel_description
        : (existing?.panel_description ?? null),
    panel_rules:
      patch.panel_rules !== undefined
        ? patch.panel_rules
        : (existing?.panel_rules ?? ""),
    panel_image_url:
      patch.panel_image_url !== undefined
        ? patch.panel_image_url
        : (existing?.panel_image_url ?? null),
    ticket_counter: patch.ticket_counter ?? existing?.ticket_counter ?? 0,
    inactivity_hours:
      patch.inactivity_hours !== undefined
        ? patch.inactivity_hours
        : (existing?.inactivity_hours ?? null),
    send_dm_on_close:
      patch.send_dm_on_close !== undefined
        ? patch.send_dm_on_close
        : (existing?.send_dm_on_close ?? null),
  };

  getDb()
    .prepare(
      `INSERT INTO guild_settings (
        guild_id, ticket_category_id, log_channel_id, support_role_ids,
        panel_color, panel_title, panel_footer, panel_description, panel_rules, panel_image_url,
        ticket_counter, inactivity_hours, send_dm_on_close
      ) VALUES (
        @guild_id, @ticket_category_id, @log_channel_id, @support_role_ids,
        @panel_color, @panel_title, @panel_footer, @panel_description, @panel_rules, @panel_image_url,
        @ticket_counter, @inactivity_hours, @send_dm_on_close
      )
      ON CONFLICT(guild_id) DO UPDATE SET
        ticket_category_id = excluded.ticket_category_id,
        log_channel_id = excluded.log_channel_id,
        support_role_ids = excluded.support_role_ids,
        panel_color = excluded.panel_color,
        panel_title = excluded.panel_title,
        panel_footer = excluded.panel_footer,
        panel_description = excluded.panel_description,
        panel_rules = excluded.panel_rules,
        panel_image_url = excluded.panel_image_url,
        ticket_counter = excluded.ticket_counter,
        inactivity_hours = excluded.inactivity_hours,
        send_dm_on_close = excluded.send_dm_on_close`
    )
    .run({ guild_id: guildId, ...merged });

  return getGuildSettingsRow(guildId);
}

export function incrementTicketCounter(guildId) {
  const row = getGuildSettingsRow(guildId);
  const next = (row?.ticket_counter ?? 0) + 1;
  upsertGuildSettings(guildId, { ticket_counter: next });
  return next;
}
