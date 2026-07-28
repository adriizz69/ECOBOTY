const parseJson = (value, fallback = {}) => {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

/** Free stays at 6 items/shop; Premium raised to 50. */
export async function up(knex) {
  const hasPlans = await knex.schema.hasTable("billing_plan_definitions");
  if (!hasPlans) return;

  const free = await knex("billing_plan_definitions").where({ plan_key: "free" }).first();
  if (free) {
    await knex("billing_plan_definitions")
      .where({ plan_key: "free" })
      .update({
        limits: JSON.stringify({ ...parseJson(free.limits), shop_items_max: 6 }),
        updated_at: knex.fn.now()
      });
  }

  const premium = await knex("billing_plan_definitions").where({ plan_key: "premium" }).first();
  if (premium) {
    await knex("billing_plan_definitions")
      .where({ plan_key: "premium" })
      .update({
        limits: JSON.stringify({ ...parseJson(premium.limits), shop_items_max: 50 }),
        updated_at: knex.fn.now()
      });
  }
}

export async function down(knex) {
  const hasPlans = await knex.schema.hasTable("billing_plan_definitions");
  if (!hasPlans) return;

  const premium = await knex("billing_plan_definitions").where({ plan_key: "premium" }).first();
  if (premium) {
    await knex("billing_plan_definitions")
      .where({ plan_key: "premium" })
      .update({
        limits: JSON.stringify({ ...parseJson(premium.limits), shop_items_max: 6 }),
        updated_at: knex.fn.now()
      });
  }
}
