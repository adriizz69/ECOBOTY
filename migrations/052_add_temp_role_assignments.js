export async function up(knex) {
  await knex.schema.createTable("temp_role_assignments", (table) => {
    table.increments("id").primary();
    table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
    table.string("user_discord_id").notNullable();
    table.string("role_id").notNullable();
    table.timestamp("expires_at").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.unique(["guild_id", "user_discord_id", "role_id"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("temp_role_assignments");
}
