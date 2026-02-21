export async function up(knex) {
  await knex.schema.alterTable("shops", (table) => {
    table.string("image_url");
    table.text("description");
  });

  await knex.schema.alterTable("shop_items", (table) => {
    table.text("description");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("shop_items", (table) => {
    table.dropColumn("description");
  });

  await knex.schema.alterTable("shops", (table) => {
    table.dropColumn("image_url");
    table.dropColumn("description");
  });
}
