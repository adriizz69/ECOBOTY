export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_settings");
  if (!hasTable) {
    await knex.schema.createTable("twitch_settings", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("twitch_broadcaster_id").notNullable();
      table.string("twitch_login").notNullable();
      table.text("access_token").notNullable();
      table.text("refresh_token").notNullable();
      table.timestamp("token_expires_at");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["guild_id"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_settings");
  if (hasTable) {
    await knex.schema.dropTable("twitch_settings");
  }
}
