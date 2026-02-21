export async function up(knex) {
  const hasTable = await knex.schema.hasTable("user_guilds");
  if (!hasTable) return;
  await knex.raw("ALTER TABLE user_guilds CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
}

export async function down(knex) {
  // no-op: avoid destructive charset downgrade
}
