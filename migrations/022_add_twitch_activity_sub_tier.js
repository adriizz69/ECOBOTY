export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_activity");
  if (hasTable) {
    const hasTier = await knex.schema.hasColumn("twitch_activity", "sub_tier");
    if (!hasTier) {
      await knex.schema.alterTable("twitch_activity", (table) => {
        table.enum("sub_tier", ["t1", "t2", "t3"]).nullable();
        table.timestamp("sub_tier_updated_at").nullable();
      });
    }
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_activity");
  if (hasTable) {
    const hasTier = await knex.schema.hasColumn("twitch_activity", "sub_tier");
    if (hasTier) {
      await knex.schema.alterTable("twitch_activity", (table) => {
        table.dropColumn("sub_tier");
        table.dropColumn("sub_tier_updated_at");
      });
    }
  }
}
