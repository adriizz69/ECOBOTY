const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve('.env') });
const knex = require('knex')({ client: 'mysql2', connection: process.env.DATABASE_URL });

(async () => {
  try {
    const nowRows = await knex.raw("SELECT NOW() as now_local, UTC_TIMESTAMP() as now_utc, @@global.time_zone as global_tz, @@session.time_zone as session_tz, TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), NOW()) as local_minus_utc");
    console.log('nowRows', nowRows[0]);
    const latestRows = await knex.raw("SELECT created_at, TIMESTAMPDIFF(MINUTE, created_at, UTC_TIMESTAMP()) as minutes_to_utc, TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_to_now FROM economy_gain_logs ORDER BY created_at DESC LIMIT 3");
    console.log('latestRows', latestRows[0]);
  } catch (error) {
    console.error(error);
  } finally {
    await knex.destroy();
  }
})();
