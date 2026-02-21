export async function up(knex) {
  const hasLogChannel = await knex.schema.hasColumn("economy_settings", "log_channel_id");
  if (!hasLogChannel) {
    await knex.schema.table("economy_settings", (table) => {
      table.string("log_channel_id");
    });
  }

  const hasTable = await knex.schema.hasTable("economy_event_logs");
  if (!hasTable) {
    await knex.schema.createTable("economy_event_logs", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("category").notNullable();
      table.string("type").notNullable();
      table.string("user_discord_id").notNullable();
      table.integer("amount").defaultTo(0);
      table.json("data");
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("economy_event_logs");
  if (hasTable) {
    await knex.schema.dropTable("economy_event_logs");
  }
  const hasLogChannel = await knex.schema.hasColumn("economy_settings", "log_channel_id");
  if (hasLogChannel) {
    await knex.schema.table("economy_settings", (table) => {
      table.dropColumn("log_channel_id");
    });
  }
}
