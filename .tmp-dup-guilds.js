const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve('.env') });
const knex = require('knex')({ client: 'mysql2', connection: process.env.DATABASE_URL });
(async () => {
  try {
    const rows = await knex('guilds')
      .select('discord_guild_id')
      .count({ c: 'id' })
      .groupBy('discord_guild_id')
      .havingRaw('COUNT(id) > 1');
    console.log(rows);
    if (rows.length) {
      for (const r of rows) {
        const details = await knex('guilds').where({ discord_guild_id: r.discord_guild_id }).select('id', 'discord_guild_id', 'name');
        console.log(details);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await knex.destroy();
  }
})();
