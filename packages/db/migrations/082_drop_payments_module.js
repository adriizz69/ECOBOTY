const PAYMENT_TABLES = [
  "payment_webhook_events",
  "payment_trial_consumptions",
  "payment_server_offers",
  "payment_refunds",
  "payment_invoices",
  "payment_transactions",
  "payment_coupons",
  "payment_offers",
  "payment_customers",
  "payment_settings"
];

const USER_PREMIUM_COLUMNS = [
  "is_premium",
  "premium_status",
  "premium_plan",
  "premium_since",
  "premium_until",
  "premium_source"
];

export async function up(knex) {
  for (const tableName of PAYMENT_TABLES) {
    await knex.schema.dropTableIfExists(tableName);
  }

  const hasUsers = await knex.schema.hasTable("users");
  if (hasUsers) {
    const columnsToDrop = [];
    for (const column of USER_PREMIUM_COLUMNS) {
      if (await knex.schema.hasColumn("users", column)) {
        columnsToDrop.push(column);
      }
    }
    if (columnsToDrop.length) {
      await knex.schema.alterTable("users", (table) => {
        for (const column of columnsToDrop) {
          table.dropColumn(column);
        }
      });
    }
  }
}

export async function down() {
  // The old Stripe/premium payments module is intentionally removed for good.
  // Recreating its schema is out of scope; restore from a backup if ever needed.
}
