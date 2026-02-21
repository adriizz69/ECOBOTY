export async function up(knex) {
  const hasTwitchId = await knex.schema.hasColumn("users", "twitch_id");
  if (!hasTwitchId) {
    await knex.schema.table("users", (table) => {
      table.string("twitch_id");
    });
  }

  const hasTwitchLogin = await knex.schema.hasColumn("users", "twitch_login");
  if (!hasTwitchLogin) {
    await knex.schema.table("users", (table) => {
      table.string("twitch_login");
    });
  }
}

export async function down(knex) {
  const hasTwitchLogin = await knex.schema.hasColumn("users", "twitch_login");
  if (hasTwitchLogin) {
    await knex.schema.table("users", (table) => {
      table.dropColumn("twitch_login");
    });
  }

  const hasTwitchId = await knex.schema.hasColumn("users", "twitch_id");
  if (hasTwitchId) {
    await knex.schema.table("users", (table) => {
      table.dropColumn("twitch_id");
    });
  }
}
