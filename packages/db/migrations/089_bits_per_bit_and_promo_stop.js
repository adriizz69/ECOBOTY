/**
 * Bits: store coins-per-bit (was coins-per-100-bits).
 * Promo: optional !stop opt-out for unlinked viewers.
 */
export async function up(knex) {
  if (await knex.schema.hasTable("twitch_event_rules")) {
    // Convert legacy "amount for 100 bits" → "amount per 1 bit"
    await knex("twitch_event_rules")
      .where({ type: "bits" })
      .andWhere("amount", ">", 0)
      .update({
        amount: knex.raw("GREATEST(0, FLOOR(amount / 100))")
      });
  }

  if (await knex.schema.hasTable("twitch_settings")) {
    const hasStop = await knex.schema.hasColumn("twitch_settings", "promo_stop_enabled");
    if (!hasStop) {
      await knex.schema.alterTable("twitch_settings", (table) => {
        table.boolean("promo_stop_enabled").notNullable().defaultTo(true);
      });
    }
  }

  if (await knex.schema.hasTable("twitch_activity")) {
    const hasOptOut = await knex.schema.hasColumn("twitch_activity", "promo_opted_out");
    if (!hasOptOut) {
      await knex.schema.alterTable("twitch_activity", (table) => {
        table.boolean("promo_opted_out").notNullable().defaultTo(false);
      });
    }
  }
}

export async function down(knex) {
  if (await knex.schema.hasTable("twitch_event_rules")) {
    await knex("twitch_event_rules")
      .where({ type: "bits" })
      .andWhere("amount", ">", 0)
      .update({
        amount: knex.raw("amount * 100")
      });
  }

  if (await knex.schema.hasTable("twitch_activity")) {
    if (await knex.schema.hasColumn("twitch_activity", "promo_opted_out")) {
      await knex.schema.alterTable("twitch_activity", (table) => {
        table.dropColumn("promo_opted_out");
      });
    }
  }

  if (await knex.schema.hasTable("twitch_settings")) {
    if (await knex.schema.hasColumn("twitch_settings", "promo_stop_enabled")) {
      await knex.schema.alterTable("twitch_settings", (table) => {
        table.dropColumn("promo_stop_enabled");
      });
    }
  }
}
