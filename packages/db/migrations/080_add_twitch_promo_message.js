export async function up(knex) {
  if (await knex.schema.hasTable("twitch_settings")) {
    const hasEnabled = await knex.schema.hasColumn("twitch_settings", "promo_enabled");
    if (!hasEnabled) {
      await knex.schema.alterTable("twitch_settings", (table) => {
        table.boolean("promo_enabled").notNullable().defaultTo(false);
        table.text("promo_template").nullable();
        table.string("promo_discord_url", 500).nullable();
        table.boolean("promo_on_follow").notNullable().defaultTo(true);
        table.boolean("promo_on_first_message").notNullable().defaultTo(true);
        table.boolean("promo_remind_unlinked").notNullable().defaultTo(true);
      });
    }
  }

  if (await knex.schema.hasTable("twitch_activity")) {
    const hasFirst = await knex.schema.hasColumn("twitch_activity", "promo_first_message_sent");
    if (!hasFirst) {
      await knex.schema.alterTable("twitch_activity", (table) => {
        table.boolean("promo_first_message_sent").notNullable().defaultTo(false);
        table.string("promo_remind_stream_id", 64).nullable();
      });
    }
  }
}

export async function down(knex) {
  if (await knex.schema.hasTable("twitch_activity")) {
    const hasFirst = await knex.schema.hasColumn("twitch_activity", "promo_first_message_sent");
    if (hasFirst) {
      await knex.schema.alterTable("twitch_activity", (table) => {
        table.dropColumn("promo_first_message_sent");
        table.dropColumn("promo_remind_stream_id");
      });
    }
  }
  if (await knex.schema.hasTable("twitch_settings")) {
    const hasEnabled = await knex.schema.hasColumn("twitch_settings", "promo_enabled");
    if (hasEnabled) {
      await knex.schema.alterTable("twitch_settings", (table) => {
        table.dropColumn("promo_enabled");
        table.dropColumn("promo_template");
        table.dropColumn("promo_discord_url");
        table.dropColumn("promo_on_follow");
        table.dropColumn("promo_on_first_message");
        table.dropColumn("promo_remind_unlinked");
      });
    }
  }
}
