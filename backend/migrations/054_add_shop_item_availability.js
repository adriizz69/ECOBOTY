export async function up(knex) {
  const hasTable = await knex.schema.hasTable("shop_items");
  if (!hasTable) return;

  const hasFrom = await knex.schema.hasColumn("shop_items", "available_from");
  if (!hasFrom) {
    await knex.schema.table("shop_items", (table) => {
      table.dateTime("available_from").nullable();
    });
  }

  const hasTo = await knex.schema.hasColumn("shop_items", "available_to");
  if (!hasTo) {
    await knex.schema.table("shop_items", (table) => {
      table.dateTime("available_to").nullable();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("shop_items");
  if (!hasTable) return;

  const hasFrom = await knex.schema.hasColumn("shop_items", "available_from");
  if (hasFrom) {
    await knex.schema.table("shop_items", (table) => {
      table.dropColumn("available_from");
    });
  }

  const hasTo = await knex.schema.hasColumn("shop_items", "available_to");
  if (hasTo) {
    await knex.schema.table("shop_items", (table) => {
      table.dropColumn("available_to");
    });
  }
}
