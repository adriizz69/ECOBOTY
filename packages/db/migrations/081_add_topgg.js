const GAIN_SOURCES_WITH_TOPGG =
  "ENUM('message','voice','manual','reset','purchase','daily','achievement','twitch_message','twitch_watch','twitch_sub','twitch_subgift','twitch_bits','twitch_daily','game','lootbox','topgg') NOT NULL";

const GAIN_SOURCES_WITHOUT_TOPGG =
  "ENUM('message','voice','manual','reset','purchase','daily','achievement','twitch_message','twitch_watch','twitch_sub','twitch_subgift','twitch_bits','twitch_daily','game','lootbox') NOT NULL";

export async function up(knex) {
  const hasSettings = await knex.schema.hasTable("topgg_settings");
  if (!hasSettings) {
    await knex.schema.createTable("topgg_settings", (table) => {
      table.increments("id").primary();
      table.boolean("enabled").notNullable().defaultTo(true);
      table.integer("reward_amount").unsigned().notNullable().defaultTo(500);
      table.dateTime("last_metrics_sync_at").nullable();
      table.integer("last_metrics_server_count").nullable();
      table.text("last_metrics_error").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
    });
    await knex("topgg_settings").insert({
      enabled: true,
      reward_amount: 500
    });
  }

  const hasVotes = await knex.schema.hasTable("topgg_votes");
  if (!hasVotes) {
    await knex.schema.createTable("topgg_votes", (table) => {
      table.increments("id").primary();
      table.string("topgg_vote_id", 64).notNullable().unique();
      table.string("discord_user_id", 32).notNullable().index();
      table.string("topgg_user_id", 64).nullable();
      table.string("username", 128).nullable();
      table.integer("weight").unsigned().notNullable().defaultTo(1);
      table.dateTime("voted_at").notNullable();
      table.dateTime("expires_at").nullable();
      table.dateTime("claimed_at").nullable();
      table.string("claimed_guild_id", 32).nullable();
      table.integer("reward_amount").unsigned().nullable();
      table.json("payload").nullable();
      table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
      table.dateTime("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasGainLogs = await knex.schema.hasTable("economy_gain_logs");
  if (hasGainLogs) {
    await knex.raw(`ALTER TABLE economy_gain_logs MODIFY COLUMN source ${GAIN_SOURCES_WITH_TOPGG}`);
  }
}

export async function down(knex) {
  const hasGainLogs = await knex.schema.hasTable("economy_gain_logs");
  if (hasGainLogs) {
    await knex("economy_gain_logs").where({ source: "topgg" }).update({ source: "manual" });
    await knex.raw(`ALTER TABLE economy_gain_logs MODIFY COLUMN source ${GAIN_SOURCES_WITHOUT_TOPGG}`);
  }

  const hasVotes = await knex.schema.hasTable("topgg_votes");
  if (hasVotes) {
    await knex.schema.dropTable("topgg_votes");
  }

  const hasSettings = await knex.schema.hasTable("topgg_settings");
  if (hasSettings) {
    await knex.schema.dropTable("topgg_settings");
  }
}
