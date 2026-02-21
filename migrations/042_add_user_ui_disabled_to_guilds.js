export async function up(knex) {
  const hasTable = await knex.schema.hasTable("guilds");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("guilds", "user_ui_disabled");
  if (!hasColumn) {
    await knex.schema.alterTable("guilds", (table) => {
      table.boolean("user_ui_disabled").notNullable().defaultTo(false);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("guilds");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("guilds", "user_ui_disabled");
  if (hasColumn) {
    await knex.schema.alterTable("guilds", (table) => {
      table.dropColumn("user_ui_disabled");
    });
  }
}
