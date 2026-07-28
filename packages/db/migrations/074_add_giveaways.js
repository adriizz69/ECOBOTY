export async function up(knex) {
  const hasTemplates = await knex.schema.hasTable("giveaway_templates");
  if (!hasTemplates) {
    await knex.schema.createTable("giveaway_templates", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("name", 64).notNullable();
      table.text("description").nullable();
      table.integer("duration_seconds").notNullable().defaultTo(3600);
      table.integer("winners_count").notNullable().defaultTo(1);
      table.string("channel_id").nullable();
      table.string("ping_role_id").nullable();
      table.string("organizer_label", 30).nullable();
      table.text("chance_roles_json").nullable();
      table.string("chance_multiplier_mode", 16).notNullable().defaultTo("max");
      table.integer("entry_cost").notNullable().defaultTo(0);
      table.integer("required_messages").notNullable().defaultTo(0);
      table.text("required_roles_json").nullable();
      table.string("required_roles_mode", 8).notNullable().defaultTo("any");
      table.text("blocked_roles_json").nullable();
      table.text("image_url").nullable();
      table.text("thumbnail_url").nullable();
      table.string("start_color", 7).notNullable().defaultTo("#2563EB");
      table.string("end_color", 7).notNullable().defaultTo("#22C55E");
      table.boolean("dm_enabled").notNullable().defaultTo(false);
      table.text("dm_message").nullable();
      table.string("winner_role_id").nullable();
      table.integer("winner_role_duration_seconds").nullable();
      table.string("created_by_discord_id").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
      table.index(["guild_id", "created_at"], "idx_giveaway_templates_guild_created");
    });
  }

  const hasGiveaways = await knex.schema.hasTable("giveaways");
  if (!hasGiveaways) {
    await knex.schema.createTable("giveaways", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table
        .integer("template_id")
        .unsigned()
        .nullable()
        .references("giveaway_templates.id")
        .onDelete("SET NULL");
      table.string("name", 64).notNullable();
      table.text("description").nullable();
      table.string("status", 16).notNullable().defaultTo("scheduled");
      table.dateTime("start_at").notNullable();
      table.dateTime("end_at").notNullable();
      table.integer("winners_count").notNullable().defaultTo(1);
      table.string("channel_id").notNullable();
      table.string("ping_role_id").nullable();
      table.string("organizer_label", 30).nullable();
      table.text("chance_roles_json").nullable();
      table.string("chance_multiplier_mode", 16).notNullable().defaultTo("max");
      table.integer("entry_cost").notNullable().defaultTo(0);
      table.integer("required_messages").notNullable().defaultTo(0);
      table.text("required_roles_json").nullable();
      table.string("required_roles_mode", 8).notNullable().defaultTo("any");
      table.text("blocked_roles_json").nullable();
      table.text("image_url").nullable();
      table.text("thumbnail_url").nullable();
      table.string("start_color", 7).notNullable().defaultTo("#2563EB");
      table.string("end_color", 7).notNullable().defaultTo("#22C55E");
      table.boolean("dm_enabled").notNullable().defaultTo(false);
      table.text("dm_message").nullable();
      table.string("winner_role_id").nullable();
      table.integer("winner_role_duration_seconds").nullable();
      table.string("message_id").nullable();
      table.string("end_message_id").nullable();
      table.string("created_by_discord_id").nullable();
      table.dateTime("started_at").nullable();
      table.dateTime("ended_at").nullable();
      table.dateTime("cancelled_at").nullable();
      table.dateTime("start_claimed_at").nullable();
      table.dateTime("end_claimed_at").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
      table.index(["guild_id", "status", "start_at"], "idx_giveaways_guild_status_start");
      table.index(["guild_id", "status", "end_at"], "idx_giveaways_guild_status_end");
      table.index(["guild_id", "created_at"], "idx_giveaways_guild_created");
    });
  }

  const hasEntries = await knex.schema.hasTable("giveaway_entries");
  if (!hasEntries) {
    await knex.schema.createTable("giveaway_entries", (table) => {
      table.increments("id").primary();
      table.integer("giveaway_id").unsigned().notNullable().references("giveaways.id").onDelete("CASCADE");
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.integer("entry_cost_paid").notNullable().defaultTo(0);
      table.integer("ticket_weight").notNullable().defaultTo(1);
      table.text("role_snapshot_json").nullable();
      table.dateTime("joined_at").notNullable().defaultTo(knex.fn.now());
      table.unique(["giveaway_id", "user_discord_id"], "uq_giveaway_entries_user");
      table.index(["guild_id", "user_discord_id"], "idx_giveaway_entries_guild_user");
    });
  }

  const hasMessageCounts = await knex.schema.hasTable("giveaway_message_counts");
  if (!hasMessageCounts) {
    await knex.schema.createTable("giveaway_message_counts", (table) => {
      table.increments("id").primary();
      table.integer("giveaway_id").unsigned().notNullable().references("giveaways.id").onDelete("CASCADE");
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.integer("message_count").notNullable().defaultTo(0);
      table.dateTime("first_message_at").nullable();
      table.dateTime("last_message_at").nullable();
      table.unique(["giveaway_id", "user_discord_id"], "uq_giveaway_message_counts_user");
      table.index(["guild_id", "user_discord_id"], "idx_giveaway_message_counts_guild_user");
    });
  }

  const hasWinners = await knex.schema.hasTable("giveaway_winners");
  if (!hasWinners) {
    await knex.schema.createTable("giveaway_winners", (table) => {
      table.increments("id").primary();
      table.integer("giveaway_id").unsigned().notNullable().references("giveaways.id").onDelete("CASCADE");
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.integer("draw_rank").notNullable().defaultTo(1);
      table.string("draw_type", 16).notNullable().defaultTo("draw");
      table.boolean("active").notNullable().defaultTo(true);
      table
        .integer("replaced_winner_id")
        .unsigned()
        .nullable()
        .references("giveaway_winners.id")
        .onDelete("SET NULL");
      table.dateTime("drawn_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
      table.index(["giveaway_id", "active"], "idx_giveaway_winners_active");
      table.index(["giveaway_id", "draw_rank"], "idx_giveaway_winners_rank");
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("giveaway_winners");
  await knex.schema.dropTableIfExists("giveaway_message_counts");
  await knex.schema.dropTableIfExists("giveaway_entries");
  await knex.schema.dropTableIfExists("giveaways");
  await knex.schema.dropTableIfExists("giveaway_templates");
}
