export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_rules");
  if (!hasTable) {
    await knex.schema.createTable("twitch_rules", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.enum("type", ["message", "watch"]).notNullable();
      table.integer("min_gain").defaultTo(0);
      table.integer("max_gain").defaultTo(0);
      table.integer("interval").defaultTo(1);
      table.boolean("enabled").defaultTo(false);
      table.unique(["guild_id", "type"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_rules");
  if (hasTable) {
    await knex.schema.dropTable("twitch_rules");
  }
}
