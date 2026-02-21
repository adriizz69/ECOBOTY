export async function up(knex) {
  await knex.schema.alterTable("shops", (table) => {
    table.json("required_role_ids");
  });
}

export async function down(knex) {
  await knex.schema.alterTable("shops", (table) => {
    table.dropColumn("required_role_ids");
  });
}
