/**
 * Track Twitch live sessions for admin history (avg viewers, unique chatters, games).
 */
export async function up(knex) {
  const exists = await knex.schema.hasTable("twitch_live_sessions");
  if (exists) return;

  await knex.schema.createTable("twitch_live_sessions", (table) => {
    table.increments("id").primary();
    table.integer("guild_id").unsigned().notNullable();
    table.string("stream_id", 64).notNullable();
    table.string("title", 255).nullable();
    table.dateTime("started_at").nullable();
    table.dateTime("ended_at").nullable();
    table.integer("avg_viewers").unsigned().notNullable().defaultTo(0);
    table.integer("peak_viewers").unsigned().notNullable().defaultTo(0);
    table.bigInteger("viewer_samples_sum").unsigned().notNullable().defaultTo(0);
    table.integer("viewer_samples_count").unsigned().notNullable().defaultTo(0);
    table.integer("unique_viewers").unsigned().notNullable().defaultTo(0);
    table.text("games_json").nullable();
    table.timestamps(true, true);

    table.unique(["guild_id", "stream_id"]);
    table.index(["guild_id", "started_at"]);
    table.foreign("guild_id").references("id").inTable("guilds").onDelete("CASCADE");
  });
}

export async function down(knex) {
  if (await knex.schema.hasTable("twitch_live_sessions")) {
    await knex.schema.dropTable("twitch_live_sessions");
  }
}
