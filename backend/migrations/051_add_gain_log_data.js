export async function up(knex) {
  const hasTable = await knex.schema.hasTable("economy_gain_logs");
  if (!hasTable) return;
  const hasData = await knex.schema.hasColumn("economy_gain_logs", "data");
  if (!hasData) {
    await knex.schema.alterTable("economy_gain_logs", (table) => {
      table.json("data");
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("economy_gain_logs");
  if (!hasTable) return;
  const hasData = await knex.schema.hasColumn("economy_gain_logs", "data");
  if (hasData) {
    await knex.schema.alterTable("economy_gain_logs", (table) => {
      table.dropColumn("data");
    });
  }
}
