export async function up(knex) {
  const hasTable = await knex.schema.hasTable("bot_health_status");
  if (!hasTable) {
    await knex.schema.createTable("bot_health_status", (table) => {
      table.increments("id").primary();
      table.string("service").notNullable().defaultTo("discord_bot");
      table.string("status").notNullable().defaultTo("offline");
      table.timestamp("last_heartbeat_at").nullable();
      table.timestamp("last_status_change_at").nullable();
      table.string("last_reason").nullable();
      table.integer("guild_count").unsigned().nullable();
      table.integer("uptime_seconds").unsigned().nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["service"]);
    });
  }
}

export async function down(knex) {
  const hasTable = await knex.schema.hasTable("bot_health_status");
  if (hasTable) {
    await knex.schema.dropTable("bot_health_status");
  }
}

