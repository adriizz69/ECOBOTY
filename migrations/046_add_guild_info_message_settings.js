export async function up(knex) {
  const hasTable = await knex.schema.hasTable("guild_info_message_settings");
  if (hasTable) return;
  await knex.schema.createTable("guild_info_message_settings", (table) => {
    table.integer("guild_id").unsigned().primary().references("guilds.id").onDelete("CASCADE");
    table.string("channel_id").nullable();
    table.string("message_id").nullable();
    table.json("sections").nullable();
    table.json("shop_ids").nullable();
    table.boolean("include_game_chances").defaultTo(false);
    table.boolean("include_shop_discounts").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("guild_info_message_settings");
}
