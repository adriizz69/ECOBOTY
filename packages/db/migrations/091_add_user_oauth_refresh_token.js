export async function up(knex) {
  const hasTable = await knex.schema.hasTable("user_oauth_state");
  if (!hasTable) return;

  const hasRefresh = await knex.schema.hasColumn("user_oauth_state", "discord_refresh_token");
  if (!hasRefresh) {
    await knex.schema.alterTable("user_oauth_state", (table) => {
      table.text("discord_refresh_token").nullable();
    });
  }

  const hasCheckedAt = await knex.schema.hasColumn("user_oauth_state", "twitch_link_checked_at");
  if (!hasCheckedAt) {
    await knex.schema.alterTable("user_oauth_state", (table) => {
      table.timestamp("twitch_link_checked_at").nullable();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("user_oauth_state");
  if (!hasTable) return;

  const hasRefresh = await knex.schema.hasColumn("user_oauth_state", "discord_refresh_token");
  if (hasRefresh) {
    await knex.schema.alterTable("user_oauth_state", (table) => {
      table.dropColumn("discord_refresh_token");
    });
  }

  const hasCheckedAt = await knex.schema.hasColumn("user_oauth_state", "twitch_link_checked_at");
  if (hasCheckedAt) {
    await knex.schema.alterTable("user_oauth_state", (table) => {
      table.dropColumn("twitch_link_checked_at");
    });
  }
}
