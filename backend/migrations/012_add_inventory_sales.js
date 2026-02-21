export async function up(knex) {
  const exists = await knex.schema.hasTable("inventory_sales");
  if (exists) return;

  await knex.schema.createTable("inventory_sales", (table) => {
    table.increments("id").primary();
    table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
    table.string("seller_discord_id").notNullable();
    table.integer("item_id").unsigned().references("shop_items.id").onDelete("CASCADE");
    table.integer("quantity").defaultTo(1);
    table.integer("price").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.index(["guild_id"], "idx_inventory_sales_guild");
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("inventory_sales");
}
