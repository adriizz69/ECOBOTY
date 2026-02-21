export async function up(knex) {
  await knex.schema
    .createTable("users", (table) => {
      table.increments("id").primary();
      table.string("discord_id").unique().notNullable();
      table.string("username").notNullable();
      table.string("avatar");
      table.timestamp("created_at").defaultTo(knex.fn.now());
    })
    .createTable("guilds", (table) => {
      table.increments("id").primary();
      table.string("discord_guild_id").unique().notNullable();
      table.string("name").notNullable();
      table.string("icon");
      table.string("owner_discord_id").notNullable();
    })
    .createTable("guild_users", (table) => {
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.integer("user_id").unsigned().references("users.id").onDelete("CASCADE");
      table.string("role").notNullable();
      table.primary(["guild_id", "user_id"]);
    })
    .createTable("economy_settings", (table) => {
      table.integer("guild_id").unsigned().primary().references("guilds.id").onDelete("CASCADE");
      table.string("name").notNullable();
      table.string("emoji_symbol");
      table.integer("start_balance").defaultTo(0);
      table.integer("max_balance").defaultTo(0);
      table.integer("daily_amount").defaultTo(0);
      table.integer("streak_7_bonus_percent").defaultTo(0);
      table.integer("streak_14_bonus_percent").defaultTo(0);
      table.integer("streak_30_bonus_percent").defaultTo(0);
      table.boolean("enabled").defaultTo(true);
    })
    .createTable("economy_rules", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.enum("type", ["message", "voice"]).notNullable();
      table.integer("min_gain").defaultTo(0);
      table.integer("max_gain").defaultTo(0);
      table.integer("interval").defaultTo(0);
      table.boolean("enabled").defaultTo(true);
    })
    .createTable("role_modifiers", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("role_id").notNullable();
      table.decimal("multiplier", 6, 2).defaultTo(1);
      table.boolean("enabled").defaultTo(true);
    })
    .createTable("channel_modifiers", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("channel_id").notNullable();
      table.decimal("multiplier", 6, 2).defaultTo(1);
      table.boolean("enabled").defaultTo(true);
    })
    .createTable("balances", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.integer("balance").defaultTo(0);
      table.integer("daily_streak").defaultTo(0);
      table.timestamp("last_daily");
      table.unique(["guild_id", "user_discord_id"]);
    })
    .createTable("shops", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("name").notNullable();
      table.string("required_role_id");
      table.integer("discount_percent").defaultTo(0);
    })
    .createTable("shop_items", (table) => {
      table.increments("id").primary();
      table.integer("shop_id").unsigned().references("shops.id").onDelete("CASCADE");
      table.string("name").notNullable();
      table.enum("type", ["role", "temp_role", "inventory", "irl", "lootbox"]).notNullable();
      table.integer("price").notNullable();
      table.integer("stock");
      table.json("data");
      table.integer("discount_percent").defaultTo(0);
    })
    .createTable("inventory", (table) => {
      table.increments("id").primary();
      table.integer("guild_id").unsigned().references("guilds.id").onDelete("CASCADE");
      table.string("user_discord_id").notNullable();
      table.integer("item_id").unsigned().references("shop_items.id").onDelete("CASCADE");
      table.integer("quantity").defaultTo(1);
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
}

export async function down(knex) {
  await knex.schema
    .dropTableIfExists("inventory")
    .dropTableIfExists("shop_items")
    .dropTableIfExists("shops")
    .dropTableIfExists("balances")
    .dropTableIfExists("channel_modifiers")
    .dropTableIfExists("role_modifiers")
    .dropTableIfExists("economy_rules")
    .dropTableIfExists("economy_settings")
    .dropTableIfExists("guild_users")
    .dropTableIfExists("guilds")
    .dropTableIfExists("users");
}
