export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_activity");
  if (!hasTable) return;

  const hasExpiry = await knex.schema.hasColumn("twitch_activity", "sub_tier_expires_at");
  if (!hasExpiry) {
    await knex.schema.alterTable("twitch_activity", (table) => {
      table.timestamp("sub_tier_expires_at").nullable();
    });
  }

  const hasTier = await knex.schema.hasColumn("twitch_activity", "sub_tier");
  if (hasTier) {
    const client = String(knex.client.config.client || "").toLowerCase();
    if (client.includes("mysql")) {
      await knex.raw(
        "ALTER TABLE `twitch_activity` MODIFY `sub_tier` ENUM('prime','t1','t2','t3') NULL"
      );
    }
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_activity");
  if (!hasTable) return;

  const hasExpiry = await knex.schema.hasColumn("twitch_activity", "sub_tier_expires_at");
  if (hasExpiry) {
    await knex.schema.alterTable("twitch_activity", (table) => {
      table.dropColumn("sub_tier_expires_at");
    });
  }

  const hasTier = await knex.schema.hasColumn("twitch_activity", "sub_tier");
  if (hasTier) {
    const client = String(knex.client.config.client || "").toLowerCase();
    if (client.includes("mysql")) {
      await knex.raw(
        "ALTER TABLE `twitch_activity` MODIFY `sub_tier` ENUM('t1','t2','t3') NULL"
      );
    }
  }
}
