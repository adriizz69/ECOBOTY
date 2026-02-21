export async function up(knex) {
  const hasBlockedRoles = await knex.schema.hasTable("economy_blocked_roles");
  if (!hasBlockedRoles) {
    await knex.schema.createTable("economy_blocked_roles", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("role_id").notNullable();
      table.unique(["guild_id", "role_id"]);
    });
  }

  const hasBlockedChannels = await knex.schema.hasTable("economy_blocked_channels");
  if (!hasBlockedChannels) {
    await knex.schema.createTable("economy_blocked_channels", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("channel_id").notNullable();
      table.unique(["guild_id", "channel_id"]);
    });
  }
}

export async function down(knex) {
  const hasBlockedRoles = await knex.schema.hasTable("economy_blocked_roles");
  if (hasBlockedRoles) {
    await knex.schema.dropTable("economy_blocked_roles");
  }
  const hasBlockedChannels = await knex.schema.hasTable("economy_blocked_channels");
  if (hasBlockedChannels) {
    await knex.schema.dropTable("economy_blocked_channels");
  }
}
