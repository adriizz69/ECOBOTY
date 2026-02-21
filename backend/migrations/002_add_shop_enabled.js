export async function up(knex) {
  await knex.schema.alterTable("shops", (table) => {
    table.boolean("enabled").defaultTo(true);
  });
}

export async function down(knex) {
  await knex.schema.alterTable("shops", (table) => {
    table.dropColumn("enabled");
  });
}
