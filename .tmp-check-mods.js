const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve('.env') });
const knex = require('knex')({ client: 'mysql2', connection: process.env.DATABASE_URL });
(async () => {
  try {
    const role = await knex('role_modifiers').limit(5);
    const channel = await knex('channel_modifiers').limit(5);
    console.log('role', role);
    console.log('channel', channel);
    if (role[0]) {
      console.log('types role stackable/enabled/multiplier', typeof role[0].stackable, typeof role[0].enabled, typeof role[0].multiplier);
    }
    if (channel[0]) {
      console.log('types channel stackable/enabled/multiplier', typeof channel[0].stackable, typeof channel[0].enabled, typeof channel[0].multiplier);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await knex.destroy();
  }
})();
