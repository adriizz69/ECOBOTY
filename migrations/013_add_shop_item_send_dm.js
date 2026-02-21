export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("shop_items", "send_dm");
  if (!hasColumn) {
    await knex.schema.table("shop_items", (table) => {
      table.boolean("send_dm").defaultTo(false);
    });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("shop_items", "send_dm");
  if (hasColumn) {
    await knex.schema.table("shop_items", (table) => {
      table.dropColumn("send_dm");
    });
  }
}
