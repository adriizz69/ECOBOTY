const sessions = new Map();

const getKey = (interaction) => `${interaction.guildId}:${interaction.user.id}`;

export const clearSessionMessages = async (interaction) => {
  const key = getKey(interaction);
  const session = sessions.get(key);
  if (!session || !session.messageIds?.length) return;
  if (!interaction.channel) return;

  for (const messageId of session.messageIds) {
    try {
      const message = await interaction.channel.messages.fetch(messageId);
      await message.delete();
    } catch {
      // ignore missing/deleted
    }
  }

  sessions.delete(key);
};

export const replaceSessionMessages = async (interaction, messageIds) => {
  await clearSessionMessages(interaction);
  const key = getKey(interaction);
  sessions.set(key, { messageIds });
};
