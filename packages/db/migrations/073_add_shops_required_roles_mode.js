export async function up(knex) {
  const hasTable = await knex.schema.hasTable("shops");
  if (!hasTable) return;

  const hasModeColumn = await knex.schema.hasColumn("shops", "required_roles_mode");
  if (!hasModeColumn) {
    await knex.schema.table("shops", (table) => {
      table.string("required_roles_mode", 8).notNullable().defaultTo("all");
    });
  }

  await knex("shops")
    .whereNull("required_roles_mode")
    .orWhere("required_roles_mode", "")
    .update({ required_roles_mode: "all" });
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("shops");
  if (!hasTable) return;

  const hasModeColumn = await knex.schema.hasColumn("shops", "required_roles_mode");
  if (!hasModeColumn) return;

  await knex.schema.table("shops", (table) => {
    table.dropColumn("required_roles_mode");
  });
}
