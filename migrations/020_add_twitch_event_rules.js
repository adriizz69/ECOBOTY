export async function up(knex) {
  const hasTable = await knex.schema.hasTable("twitch_event_rules");
  if (!hasTable) {
    await knex.schema.createTable("twitch_event_rules", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table
        .enum("type", [
          "sub_t1",
          "sub_t2",
          "sub_t3",
          "subgift_t1",
          "subgift_t2",
          "subgift_t3",
          "bits"
        ])
        .notNullable();
      table.integer("amount").defaultTo(0);
      table.boolean("enabled").defaultTo(false);
      table.unique(["guild_id", "type"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("twitch_event_rules");
  if (hasTable) {
    await knex.schema.dropTable("twitch_event_rules");
  }
}
