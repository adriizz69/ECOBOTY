/**
 * Short public link slug for Twitch→Discord onboarding: /link/{slug}/{twitchLogin}
 */
export async function up(knex) {
  const hasGuilds = await knex.schema.hasTable("guilds");
  if (!hasGuilds) return;
  const hasSlug = await knex.schema.hasColumn("guilds", "link_slug");
  if (!hasSlug) {
    await knex.schema.alterTable("guilds", (table) => {
      table.string("link_slug", 64).nullable().unique();
    });
  }
}

export async function down(knex) {
  const hasGuilds = await knex.schema.hasTable("guilds");
  if (!hasGuilds) return;
  const hasSlug = await knex.schema.hasColumn("guilds", "link_slug");
  if (hasSlug) {
    await knex.schema.alterTable("guilds", (table) => {
      table.dropColumn("link_slug");
    });
  }
}
