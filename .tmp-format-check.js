const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve('.env') });
const knex = require('knex')({ client: 'mysql2', connection: process.env.DATABASE_URL });
(async () => {
  try {
    const guild = await knex('guilds').where({ id: 1 }).first();
    const settings = await knex('bot_settings').where({ guild_id: 1 }).first();
    const tz = settings?.timezone || 'UTC';
    const rows = await knex('economy_gain_logs').where({ guild_id: 1 }).orderBy('created_at', 'desc').limit(5);
    console.log('tz', tz, 'guild', guild?.discord_guild_id);
    for (const row of rows) {
      const raw = row.created_at;
      const date = raw instanceof Date ? raw : new Date(String(raw).replace(' ', 'T') + 'Z');
      const local = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium', timeZone: tz }).format(date);
      const utc = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'UTC' }).format(date);
      console.log({
        created_at_iso: date.toISOString(),
        display_tz: local,
        display_utc: utc,
        source: row.source
      });
    }
  } catch (e) {
    console.error(e);
  } finally {
    await knex.destroy();
  }
})();
