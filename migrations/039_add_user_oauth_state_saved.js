export async function up(knex) {
  const hasTable = await knex.schema.hasTable("user_oauth_state");
  if (!hasTable) return;
  const hasSaved = await knex.schema.hasColumn("user_oauth_state", "guilds_saved_count");
  if (!hasSaved) {
    await knex.schema.alterTable("user_oauth_state", (table) => {
      table.integer("guilds_saved_count").defaultTo(0);
      table.string("guilds_sample");
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("user_oauth_state");
  if (!hasTable) return;
  const hasSaved = await knex.schema.hasColumn("user_oauth_state", "guilds_saved_count");
  if (hasSaved) {
    await knex.schema.alterTable("user_oauth_state", (table) => {
      table.dropColumn("guilds_saved_count");
      table.dropColumn("guilds_sample");
    });
  }
}
