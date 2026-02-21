export async function up(knex) {
  const exists = await knex.schema.hasTable("inventory");
  if (exists) return;

  await knex.schema.createTable("inventory", (table) => {
    table.increments("id").primary();
    table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
    table.string("user_discord_id").notNullable();
    table.integer("item_id").unsigned().references("shop_items.id").onDelete("CASCADE");
    table.integer("quantity").defaultTo(1);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("inventory");
}
