const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve('.env') });
const knex = require('knex')({ client: 'mysql2', connection: process.env.DATABASE_URL });

const normalizeBooleanFlag = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off' || raw === '') return false;
  }
  return Boolean(value);
};
const normalizeMultiplierValue = (value, fallback = 1) => {
  if (value === undefined || value === null || value === '') return fallback;
  const raw = typeof value === 'string' ? value.trim().replace(/^x/i, '').replace(',', '.') : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

(async () => {
  try {
    const roles = await knex('role_modifiers').where({ guild_id: 1 }).orderBy('id', 'asc');
    const enabledRoleBoosters = roles.filter((r) => normalizeBooleanFlag(r.enabled, true));
    const stackableRoleBoosters = enabledRoleBoosters.filter((r) => normalizeBooleanFlag(r.stackable, false));
    const nonStackableRoleBoosters = enabledRoleBoosters.filter((r) => !normalizeBooleanFlag(r.stackable, false));
    const roleMax = nonStackableRoleBoosters.length
      ? nonStackableRoleBoosters.reduce((max, r) => Math.max(max, normalizeMultiplierValue(r.multiplier, 1)), Number.NEGATIVE_INFINITY)
      : 1;
    const roleStack = stackableRoleBoosters.reduce((acc, r) => acc * normalizeMultiplierValue(r.multiplier, 1), 1);
    console.log({
      total: roles.length,
      stackable_count: stackableRoleBoosters.length,
      non_stackable_count: nonStackableRoleBoosters.length,
      roleMax,
      roleStack,
      roleMultiplier: roleMax * roleStack,
      stackables: stackableRoleBoosters.map((r) => ({ id: r.id, multiplier: r.multiplier, stackable: r.stackable }))
    });
  } catch (e) {
    console.error(e);
  } finally {
    await knex.destroy();
  }
})();
