export async function up(knex) {
  const hasTable = await knex.schema.hasTable("user_oauth_state");
  if (!hasTable) {
    await knex.schema.createTable("user_oauth_state", (table) => {
      table.increments("id").primary();
      table.string("discord_id").notNullable().unique();
      table.string("scopes");
      table.boolean("guilds_fetched").defaultTo(false);
      table.integer("guilds_count").defaultTo(0);
      table.string("guilds_error");
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("user_oauth_state");
  if (hasTable) {
    await knex.schema.dropTable("user_oauth_state");
  }
}
