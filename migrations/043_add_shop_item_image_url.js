export const up = async (knex) => {
  const hasColumn = await knex.schema.hasColumn("shop_items", "image_url");
  if (!hasColumn) {
    await knex.schema.table("shop_items", (table) => {
      table.string("image_url");
    });
  }
};

export const down = async (knex) => {
  const hasColumn = await knex.schema.hasColumn("shop_items", "image_url");
  if (hasColumn) {
    await knex.schema.table("shop_items", (table) => {
      table.dropColumn("image_url");
    });
  }
};
