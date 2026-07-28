export async function up(knex) {
  const hasTable = await knex.schema.hasTable("economy_gain_logs");
  if (!hasTable) {
    await knex.schema.createTable("economy_gain_logs", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.enum("source", ["message", "voice", "manual", "reset"]).notNullable();
      table.integer("base_amount").defaultTo(0);
      table.decimal("multiplier", 6, 2).defaultTo(1);
      table.integer("bonus_amount").defaultTo(0);
      table.integer("total_amount").defaultTo(0);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.index(["guild_id", "user_discord_id"], "idx_gain_user");
      table.index(["guild_id", "created_at"], "idx_gain_guild_date");
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("economy_gain_logs");
  if (hasTable) {
    await knex.schema.dropTable("economy_gain_logs");
  }
}
