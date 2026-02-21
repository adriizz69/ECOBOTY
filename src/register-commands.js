import dotenv from "dotenv";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

dotenv.config({ path: "../.env" });

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

const body = commands.map((command) => command.data.toJSON());
const guildId = process.env.DISCORD_GUILD_ID;
const route = guildId
  ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId)
  : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

try {
  await rest.put(route, { body });
  console.log(guildId ? "Commandes enregistrées (serveur)." : "Commandes enregistrées (global)." );
} catch (error) {
  console.error("Erreur lors de l'enregistrement des commandes", error);
}
