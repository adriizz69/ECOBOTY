const TABLES = {
  settings: "birthday_settings",
  entries: "birthday_entries",
  roleAssignments: "birthday_role_assignments"
};

const dropIfExists = async (knex, name) => {
  const exists = await knex.schema.hasTable(name);
  if (exists) {
    await knex.schema.dropTable(name);
  }
};

export async function up(knex) {
  const hasGuilds = await knex.schema.hasTable("guilds");
  if (!hasGuilds) return;

  const hasSettings = await knex.schema.hasTable(TABLES.settings);
  if (!hasSettings) {
    await knex.schema.createTable(TABLES.settings, (table) => {
      table.integer("guild_id").unsigned().primary().references("guilds.id").onDelete("CASCADE");
      table.boolean("enabled").notNullable().defaultTo(true);
      table.string("birthday_role_id").nullable();
      table.boolean("show_age_in_list").notNullable().defaultTo(true);
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasEntries = await knex.schema.hasTable(TABLES.entries);
  if (!hasEntries) {
    await knex.schema.createTable(TABLES.entries, (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.date("birth_date").notNullable();
      table.enum("source", ["command", "user", "admin"]).notNullable().defaultTo("user");
      table.string("created_by_discord_id").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
      table.unique(["guild_id", "user_discord_id"], "birthday_entries_guild_user_unique");
      table.index(["guild_id", "birth_date"], "birthday_entries_date_idx");
    });
  }

  const hasRoleAssignments = await knex.schema.hasTable(TABLES.roleAssignments);
  if (!hasRoleAssignments) {
    await knex.schema.createTable(TABLES.roleAssignments, (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().notNullable().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.string("role_id").notNullable();
      table.date("birthday_date").notNullable();
      table.enum("state", ["added", "preexisting"]).notNullable().defaultTo("added");
      table.boolean("active").notNullable().defaultTo(false);
      table.dateTime("removed_at").nullable();
      table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
      table.unique(
        ["guild_id", "user_discord_id", "role_id", "birthday_date"],
        "birthday_role_assignments_unique"
      );
      table.index(["guild_id", "active", "birthday_date"], "birthday_role_assignments_active_idx");
    });
  }
}

export async function down(knex) {
  await dropIfExists(knex, TABLES.roleAssignments);
  await dropIfExists(knex, TABLES.entries);
  await dropIfExists(knex, TABLES.settings);
}
