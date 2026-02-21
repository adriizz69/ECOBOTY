export async function up(knex) {
  const hasTable = await knex.schema.hasTable("economy_gain_logs");
  if (hasTable) {
    await knex.raw(
      "ALTER TABLE economy_gain_logs MODIFY COLUMN source ENUM('message','voice','manual','reset','purchase') NOT NULL"
    );
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("economy_gain_logs");
  if (hasTable) {
    await knex.raw(
      "ALTER TABLE economy_gain_logs MODIFY COLUMN source ENUM('message','voice','manual','reset') NOT NULL"
    );
  }
}
