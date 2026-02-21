export async function up(knex) {
  const hasTable = await knex.schema.hasTable("user_guilds");
  if (!hasTable) {
    await knex.schema.createTable("user_guilds", (table) => {
      table.increments("id").primary();
      table.string("discord_id").notNullable();
      table.string("guild_id").notNullable();
      table.string("guild_name");
      table.string("icon");
      table.boolean("owner").defaultTo(false);
      table.string("permissions");
      table.string("permissions_new");
      table.text("features");
      table.text("raw");
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["discord_id", "guild_id"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("user_guilds");
  if (hasTable) {
    await knex.schema.dropTable("user_guilds");
  }
}
