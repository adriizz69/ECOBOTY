export async function up(knex) {
  const hasRole = await knex.schema.hasColumn("role_modifiers", "stackable");
  if (!hasRole) {
    await knex.schema.table("role_modifiers", (table) => {
      table.boolean("stackable").defaultTo(false);
    });
  }

  const hasChannel = await knex.schema.hasColumn("channel_modifiers", "stackable");
  if (!hasChannel) {
    await knex.schema.table("channel_modifiers", (table) => {
      table.boolean("stackable").defaultTo(false);
    });
  }
}

export async function down(knex) {
  const hasRole = await knex.schema.hasColumn("role_modifiers", "stackable");
  if (hasRole) {
    await knex.schema.table("role_modifiers", (table) => {
      table.dropColumn("stackable");
    });
  }

  const hasChannel = await knex.schema.hasColumn("channel_modifiers", "stackable");
  if (hasChannel) {
    await knex.schema.table("channel_modifiers", (table) => {
      table.dropColumn("stackable");
    });
  }
}
