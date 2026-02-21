export async function up(knex) {
  const client = String(knex.client.config.client || "").toLowerCase();
  const isMysql = client.includes("mysql");

  if (await knex.schema.hasTable("economy_settings")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `economy_settings` MODIFY `start_balance` BIGINT NOT NULL DEFAULT 0, " +
          "MODIFY `max_balance` BIGINT NOT NULL DEFAULT 0, " +
          "MODIFY `daily_amount` BIGINT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("economy_settings", (table) => {
        table.bigInteger("start_balance").defaultTo(0).alter();
        table.bigInteger("max_balance").defaultTo(0).alter();
        table.bigInteger("daily_amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("balances")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `balances` MODIFY `balance` BIGINT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("balances", (table) => {
        table.bigInteger("balance").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("shop_items")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `shop_items` MODIFY `price` BIGINT NOT NULL"
      );
    } else {
      await knex.schema.alterTable("shop_items", (table) => {
        table.bigInteger("price").notNullable().alter();
      });
    }
  }

  if (await knex.schema.hasTable("inventory_sales")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `inventory_sales` MODIFY `price` BIGINT NOT NULL"
      );
    } else {
      await knex.schema.alterTable("inventory_sales", (table) => {
        table.bigInteger("price").notNullable().alter();
      });
    }
  }

  if (await knex.schema.hasTable("economy_gain_logs")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `economy_gain_logs` " +
          "MODIFY `base_amount` BIGINT NOT NULL DEFAULT 0, " +
          "MODIFY `bonus_amount` BIGINT NOT NULL DEFAULT 0, " +
          "MODIFY `total_amount` BIGINT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("economy_gain_logs", (table) => {
        table.bigInteger("base_amount").defaultTo(0).alter();
        table.bigInteger("bonus_amount").defaultTo(0).alter();
        table.bigInteger("total_amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("economy_event_logs")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `economy_event_logs` MODIFY `amount` BIGINT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("economy_event_logs", (table) => {
        table.bigInteger("amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("twitch_daily_settings")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `twitch_daily_settings` MODIFY `daily_amount` BIGINT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("twitch_daily_settings", (table) => {
        table.bigInteger("daily_amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("twitch_event_rules")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `twitch_event_rules` MODIFY `amount` BIGINT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("twitch_event_rules", (table) => {
        table.bigInteger("amount").defaultTo(0).alter();
      });
    }
  }
}

export async function down(knex) {
  const client = String(knex.client.config.client || "").toLowerCase();
  const isMysql = client.includes("mysql");

  if (await knex.schema.hasTable("economy_settings")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `economy_settings` MODIFY `start_balance` INT NOT NULL DEFAULT 0, " +
          "MODIFY `max_balance` INT NOT NULL DEFAULT 0, " +
          "MODIFY `daily_amount` INT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("economy_settings", (table) => {
        table.integer("start_balance").defaultTo(0).alter();
        table.integer("max_balance").defaultTo(0).alter();
        table.integer("daily_amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("balances")) {
    if (isMysql) {
      await knex.raw("ALTER TABLE `balances` MODIFY `balance` INT NOT NULL DEFAULT 0");
    } else {
      await knex.schema.alterTable("balances", (table) => {
        table.integer("balance").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("shop_items")) {
    if (isMysql) {
      await knex.raw("ALTER TABLE `shop_items` MODIFY `price` INT NOT NULL");
    } else {
      await knex.schema.alterTable("shop_items", (table) => {
        table.integer("price").notNullable().alter();
      });
    }
  }

  if (await knex.schema.hasTable("inventory_sales")) {
    if (isMysql) {
      await knex.raw("ALTER TABLE `inventory_sales` MODIFY `price` INT NOT NULL");
    } else {
      await knex.schema.alterTable("inventory_sales", (table) => {
        table.integer("price").notNullable().alter();
      });
    }
  }

  if (await knex.schema.hasTable("economy_gain_logs")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `economy_gain_logs` " +
          "MODIFY `base_amount` INT NOT NULL DEFAULT 0, " +
          "MODIFY `bonus_amount` INT NOT NULL DEFAULT 0, " +
          "MODIFY `total_amount` INT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("economy_gain_logs", (table) => {
        table.integer("base_amount").defaultTo(0).alter();
        table.integer("bonus_amount").defaultTo(0).alter();
        table.integer("total_amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("economy_event_logs")) {
    if (isMysql) {
      await knex.raw("ALTER TABLE `economy_event_logs` MODIFY `amount` INT NOT NULL DEFAULT 0");
    } else {
      await knex.schema.alterTable("economy_event_logs", (table) => {
        table.integer("amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("twitch_daily_settings")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `twitch_daily_settings` MODIFY `daily_amount` INT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("twitch_daily_settings", (table) => {
        table.integer("daily_amount").defaultTo(0).alter();
      });
    }
  }

  if (await knex.schema.hasTable("twitch_event_rules")) {
    if (isMysql) {
      await knex.raw(
        "ALTER TABLE `twitch_event_rules` MODIFY `amount` INT NOT NULL DEFAULT 0"
      );
    } else {
      await knex.schema.alterTable("twitch_event_rules", (table) => {
        table.integer("amount").defaultTo(0).alter();
      });
    }
  }
}
