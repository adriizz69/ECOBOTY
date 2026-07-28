export async function up(knex) {
  await knex.schema.alterTable("balances", (table) => {
    table.timestamp("last_daily").nullable().defaultTo(null).alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable("balances", (table) => {
    table.timestamp("last_daily").nullable().alter();
  });
}
