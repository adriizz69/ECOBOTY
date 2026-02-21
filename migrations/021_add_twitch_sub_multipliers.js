export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_sub_multipliers");
  if (!hasTable) {
    await knex.schema.createTable("twitch_sub_multipliers", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.enum("tier", ["t1", "t2", "t3"]).notNullable();
      table.decimal("multiplier", 6, 2).defaultTo(1);
      table.boolean("enabled").defaultTo(false);
      table.unique(["guild_id", "tier"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_sub_multipliers");
  if (hasTable) {
    await knex.schema.dropTable("twitch_sub_multipliers");
  }
}
