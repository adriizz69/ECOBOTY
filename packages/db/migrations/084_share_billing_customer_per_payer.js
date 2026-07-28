export async function up(knex) {
  const hasAccounts = await knex.schema.hasTable("billing_accounts");
  if (!hasAccounts) return;

  const [uniqueIndexes] = await knex.raw(
    "SHOW INDEX FROM billing_accounts WHERE Column_name = 'stripe_customer_id' AND Non_unique = 0"
  );

  for (const indexRow of uniqueIndexes || []) {
    const keyName = String(indexRow?.Key_name || "").trim();
    if (keyName && keyName !== "PRIMARY") {
      await knex.raw(`ALTER TABLE billing_accounts DROP INDEX \`${keyName}\``);
    }
  }

  const [indexes] = await knex.raw(
    "SHOW INDEX FROM billing_accounts WHERE Key_name = 'billing_accounts_stripe_customer_id_index'"
  );
  if (!Array.isArray(indexes) || !indexes.length) {
    await knex.schema.alterTable("billing_accounts", (table) => {
      table.index(["stripe_customer_id"], "billing_accounts_stripe_customer_id_index");
    });
  }
}

export async function down(knex) {
  const hasAccounts = await knex.schema.hasTable("billing_accounts");
  if (!hasAccounts) return;

  const [indexes] = await knex.raw(
    "SHOW INDEX FROM billing_accounts WHERE Key_name = 'billing_accounts_stripe_customer_id_index'"
  );
  if (Array.isArray(indexes) && indexes.length) {
    await knex.schema.alterTable("billing_accounts", (table) => {
      table.dropIndex(["stripe_customer_id"], "billing_accounts_stripe_customer_id_index");
    });
  }

  const [uniqueIndexes] = await knex.raw(
    "SHOW INDEX FROM billing_accounts WHERE Key_name = 'billing_accounts_stripe_customer_id_unique'"
  );
  if (!Array.isArray(uniqueIndexes) || !uniqueIndexes.length) {
    await knex.schema.alterTable("billing_accounts", (table) => {
      table.unique(["stripe_customer_id"], "billing_accounts_stripe_customer_id_unique");
    });
  }
}
