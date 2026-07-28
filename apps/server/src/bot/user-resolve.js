export const resolveDisplayNames = async (guild, userIds = []) => {
  const uniqueIds = [...new Set(userIds.map(String).filter(Boolean))];
  const results = {};

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const member = await guild.members.fetch(id);
        results[id] = member?.displayName || member?.user?.username || id;
        return;
      } catch {
        // ignore and try user fetch
      }
      try {
        const user = await guild.client.users.fetch(id);
        results[id] = user?.username || id;
      } catch {
        results[id] = id;
      }
    })
  );

  return results;
};
