export const up = async (knex) => {
  await knex.schema.raw(
    "ALTER TABLE `user_guilds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
  await knex.schema.raw(
    "ALTER TABLE `guilds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
};

export const down = async (knex) => {
  await knex.schema.raw(
    "ALTER TABLE `user_guilds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
  );
  await knex.schema.raw(
    "ALTER TABLE `guilds` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
  );
};
