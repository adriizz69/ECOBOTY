const TABLE = "birthday_settings";
const COLUMN = "announce_channel_id";

export async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn(TABLE, COLUMN);
  if (hasColumn) return;
  await knex.schema.alterTable(TABLE, (table) => {
    table.string(COLUMN).nullable();
  });
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable(TABLE);
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn(TABLE, COLUMN);
  if (!hasColumn) return;
  await knex.schema.alterTable(TABLE, (table) => {
    table.dropColumn(COLUMN);
  });
}
