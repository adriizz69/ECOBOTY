export async function up(knex) {
  const hasAddedAt = await knex.schema.hasColumn("guilds", "added_at");
  if (!hasAddedAt) {
    await knex.schema.alterTable("guilds", (table) => {
      table.timestamp("added_at").defaultTo(knex.fn.now());
    });
  }

  const hasAddedById = await knex.schema.hasColumn("guilds", "added_by_discord_id");
  if (!hasAddedById) {
    await knex.schema.alterTable("guilds", (table) => {
      table.string("added_by_discord_id");
    });
  }

  const hasAddedByUsername = await knex.schema.hasColumn("guilds", "added_by_username");
  if (!hasAddedByUsername) {
    await knex.schema.alterTable("guilds", (table) => {
      table.string("added_by_username");
    });
  }

  const hasBanned = await knex.schema.hasColumn("guilds", "banned");
  if (!hasBanned) {
    await knex.schema.alterTable("guilds", (table) => {
      table.boolean("banned").defaultTo(false);
      table.string("banned_reason");
      table.timestamp("banned_at");
      table.string("banned_by_discord_id");
    });
  }

  const hasBotSettings = await knex.schema.hasTable("bot_settings");
  if (!hasBotSettings) {
    await knex.schema.createTable("bot_settings", (table) => {
      table.integer("guild_id").unsigned().primary().references("guilds.id").onDelete("CASCADE");
      table.string("log_channel_id");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }

  const hasAdminLogs = await knex.schema.hasTable("admin_logs");
  if (!hasAdminLogs) {
    await knex.schema.createTable("admin_logs", (table) => {
      table.increments("id").primary();
      table.string("admin_discord_id").notNullable();
      table.string("action").notNullable();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("SET NULL");
      table.json("data");
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  const hasAdminLogs = await knex.schema.hasTable("admin_logs");
  if (hasAdminLogs) {
    await knex.schema.dropTable("admin_logs");
  }

  const hasBotSettings = await knex.schema.hasTable("bot_settings");
  if (hasBotSettings) {
    await knex.schema.dropTable("bot_settings");
  }

  const hasBanned = await knex.schema.hasColumn("guilds", "banned");
  if (hasBanned) {
    await knex.schema.alterTable("guilds", (table) => {
      table.dropColumn("banned");
      table.dropColumn("banned_reason");
      table.dropColumn("banned_at");
      table.dropColumn("banned_by_discord_id");
    });
  }

  const hasAddedByUsername = await knex.schema.hasColumn("guilds", "added_by_username");
  if (hasAddedByUsername) {
    await knex.schema.alterTable("guilds", (table) => {
      table.dropColumn("added_by_username");
    });
  }

  const hasAddedById = await knex.schema.hasColumn("guilds", "added_by_discord_id");
  if (hasAddedById) {
    await knex.schema.alterTable("guilds", (table) => {
      table.dropColumn("added_by_discord_id");
    });
  }

  const hasAddedAt = await knex.schema.hasColumn("guilds", "added_at");
  if (hasAddedAt) {
    await knex.schema.alterTable("guilds", (table) => {
      table.dropColumn("added_at");
    });
  }
}
