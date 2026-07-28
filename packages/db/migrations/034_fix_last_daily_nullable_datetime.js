export async function up(knex) {
  const hasBalances = await knex.schema.hasTable("balances");
  if (hasBalances) {
    await knex.schema.alterTable("balances", (table) => {
      table.dateTime("last_daily").nullable().defaultTo(null).alter();
    });
  }

  const hasTwitchDaily = await knex.schema.hasTable("twitch_daily_states");
  if (hasTwitchDaily) {
    await knex.schema.alterTable("twitch_daily_states", (table) => {
      table.dateTime("last_daily").nullable().defaultTo(null).alter();
    });
  }
}

export async function down(knex) {
  const hasBalances = await knex.schema.hasTable("balances");
  if (hasBalances) {
    await knex.schema.alterTable("balances", (table) => {
      table.dateTime("last_daily").nullable().alter();
    });
  }

  const hasTwitchDaily = await knex.schema.hasTable("twitch_daily_states");
  if (hasTwitchDaily) {
    await knex.schema.alterTable("twitch_daily_states", (table) => {
      table.dateTime("last_daily").nullable().alter();
    });
  }
}
