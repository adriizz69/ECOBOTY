export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("shop_items", "hidden");
  if (!hasColumn) {
    await knex.schema.table("shop_items", (table) => {
      table.boolean("hidden").defaultTo(false);
    });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("shop_items", "hidden");
  if (hasColumn) {
    await knex.schema.table("shop_items", (table) => {
      table.dropColumn("hidden");
    });
  }
}
