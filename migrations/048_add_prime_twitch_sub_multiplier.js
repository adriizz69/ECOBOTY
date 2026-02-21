export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_sub_multipliers");
  if (!hasTable) return;
  const client = String(knex.client.config.client || "").toLowerCase();
  if (client.includes("mysql")) {
    await knex.raw(
      "ALTER TABLE `twitch_sub_multipliers` MODIFY `tier` ENUM('prime','t1','t2','t3') NOT NULL"
    );
  } else {
    await knex.schema.alterTable("twitch_sub_multipliers", (table) => {
      table.string("tier", 16).notNullable().alter();
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_sub_multipliers");
  if (!hasTable) return;
  await knex("twitch_sub_multipliers").where({ tier: "prime" }).del();
  const client = String(knex.client.config.client || "").toLowerCase();
  if (client.includes("mysql")) {
    await knex.raw(
      "ALTER TABLE `twitch_sub_multipliers` MODIFY `tier` ENUM('t1','t2','t3') NOT NULL"
    );
  } else {
    await knex.schema.alterTable("twitch_sub_multipliers", (table) => {
      table.string("tier", 16).notNullable().alter();
    });
  }
}
