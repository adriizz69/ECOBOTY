export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("shops", "required_role_ids");
  if (!hasColumn) {
    await knex.schema.alterTable("shops", (table) => {
      table.json("required_role_ids");
    });
  }
}

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("shops", "required_role_ids");
  if (hasColumn) {
    await knex.schema.alterTable("shops", (table) => {
      table.dropColumn("required_role_ids");
    });
  }
}
