export async function up(knex) {
  const hasLogs = await knex.schema.hasTable("topgg_metrics_logs");
  if (!hasLogs) {
    await knex.schema.createTable("topgg_metrics_logs", (table) => {
      table.increments("id").primary();
      table.string("origin", 32).notNullable().defaultTo("unknown").index();
      table.integer("server_count").unsigned().notNullable().defaultTo(0);
      table.boolean("success").notNullable().defaultTo(false).index();
      table.boolean("skipped").notNullable().defaultTo(false).index();
      table.string("reason", 64).nullable();
      table.text("message").nullable();
      table.json("payload").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now()).index();
    });
  }
}

export async function down(knex) {
  const hasLogs = await knex.schema.hasTable("topgg_metrics_logs");
  if (hasLogs) {
    await knex.schema.dropTable("topgg_metrics_logs");
  }
}
