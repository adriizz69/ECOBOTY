import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const commandsModule = await import(pathToFileURL(path.join(root, "apps/server/src/bot/commands/index.js")).href);
const { commands } = commandsModule;

const FR_NAME = {
  daily: "daily",
  shop: "boutique",
  buy: "acheter",
  achievements: "succes",
  birthday: "anniversaire",
  "birthday-list": "anniversaire-list",
  "add-money": "ajouter-argent",
  leaderboard: "classement",
  games: "jeux",
  inventory: "inventaire",
  sale: "vente",
  vote: "vote"
};

const FR_FROM_DEFAULT = {
  boutique: "shop",
  acheter: "buy",
  succes: "achievements",
  anniversaire: "birthday",
  "anniversaire-list": "birthday-list",
  "ajouter-argent": "add-money",
  classement: "leaderboard",
  jeux: "games",
  inventaire: "inventory",
  vente: "sale",
  daily: "daily",
  vote: "vote"
};

const FR_DESC = {
  daily: "Récupérer votre récompense quotidienne",
  shop: "Afficher la liste des shops",
  buy: "Acheter un article par ID",
  achievements: "Voir tes succes et ta progression",
  birthday: "Ajouter ou modifier ta date d'anniversaire",
  "birthday-list": "Afficher les 10 prochains anniversaires",
  "add-money": "Ajouter de l'argent à un membre (admin / rôle sensible)",
  leaderboard: "Afficher le classement",
  games: "Mini-jeux de paris",
  inventory: "Afficher votre inventaire",
  sale: "Vendre ou acheter des objets",
  vote: "Voter pour EcoBoty sur Top.gg et récupérer la récompense"
};

const EN_DESC = {
  daily: "Claim your daily reward",
  shop: "Show the list of shops",
  buy: "Buy an item by ID",
  achievements: "View your achievements and progress",
  birthday: "Add or edit your birthday date",
  "birthday-list": "Show the next 10 birthdays",
  "add-money": "Add money to a member (admin / sensitive role)",
  leaderboard: "Show the leaderboard",
  games: "Betting mini-games",
  inventory: "Show your inventory",
  sale: "Sell or buy items",
  vote: "Vote for EcoBoty on Top.gg and claim your reward"
};

const ES_NAME = {
  daily: "diario",
  shop: "tienda",
  buy: "comprar",
  achievements: "logros",
  birthday: "cumpleanos",
  "birthday-list": "lista-cumpleanos",
  "add-money": "agregar-dinero",
  leaderboard: "clasificacion",
  games: "juegos",
  inventory: "inventario",
  sale: "venta",
  vote: "votar"
};

const ES_DESC = {
  daily: "Reclamar tu recompensa diaria",
  shop: "Mostrar la lista de tiendas",
  buy: "Comprar un artículo por ID",
  achievements: "Ver tus logros y tu progreso",
  birthday: "Añadir o editar tu fecha de cumpleaños",
  "birthday-list": "Mostrar los 10 próximos cumpleaños",
  "add-money": "Añadir dinero a un miembro (admin / rol sensible)",
  leaderboard: "Mostrar la clasificación",
  games: "Mini-juegos de apuestas",
  inventory: "Mostrar tu inventario",
  sale: "Vender o comprar objetos",
  vote: "Votar por EcoBoty en Top.gg y reclamar tu recompensa"
};

const OPT_MAP = {
  utilisateur: { en: "user", fr: "utilisateur", es: "usuario", frDesc: "Membre concerné", enDesc: "Target member", esDesc: "Miembro" },
  user: { en: "user", fr: "utilisateur", es: "usuario", frDesc: "Membre concerné", enDesc: "Target member", esDesc: "Miembro" },
  montant: { en: "amount", fr: "montant", es: "cantidad", frDesc: "Montant", enDesc: "Amount", esDesc: "Cantidad" },
  amount: { en: "amount", fr: "montant", es: "cantidad", frDesc: "Montant", enDesc: "Amount", esDesc: "Cantidad" },
  item_id: { en: "item_id", fr: "item_id", es: "id_articulo", frDesc: "ID de l'article", enDesc: "Item ID", esDesc: "ID del artículo" },
  page: { en: "page", fr: "page", es: "pagina", frDesc: "Numéro de page", enDesc: "Page number", esDesc: "Número de página" },
  link: { en: "link", fr: "lien", es: "enlace", frDesc: "Ouvre le lien de vote Top.gg", enDesc: "Open the Top.gg vote link", esDesc: "Abre el enlace de voto de Top.gg" },
  claim: { en: "claim", fr: "reclamer", es: "reclamar", frDesc: "Récupérer la récompense après avoir voté", enDesc: "Claim your reward after voting", esDesc: "Reclama tu recompensa después de votar" }
};

function mapOption(opt) {
  const m = OPT_MAP[opt.name] || {
    en: opt.name,
    fr: opt.name,
    es: opt.name,
    enDesc: opt.description_localizations?.["en-US"] || opt.description,
    frDesc: opt.description,
    esDesc: opt.description_localizations?.["es-ES"] || opt.description
  };
  const out = {
    ...opt,
    name: m.en,
    name_localizations: {
      "en-US": m.en,
      fr: m.fr,
      "es-ES": m.es
    },
    description: m.enDesc || opt.description_localizations?.["en-US"] || opt.description,
    description_localizations: {
      "en-US": m.enDesc || opt.description_localizations?.["en-US"] || opt.description,
      fr: m.frDesc || opt.description,
      "es-ES": m.esDesc || opt.description_localizations?.["es-ES"] || opt.description
    }
  };
  if (Array.isArray(opt.options)) out.options = opt.options.map(mapOption);
  return out;
}

function mapCommand(raw) {
  const enName = FR_FROM_DEFAULT[raw.name] || raw.name_localizations?.["en-US"] || raw.name;
  const out = {
    type: 1,
    name: enName,
    name_localizations: {
      "en-US": enName,
      fr: FR_NAME[enName] || raw.name,
      "es-ES": ES_NAME[enName] || enName
    },
    description: EN_DESC[enName] || raw.description_localizations?.["en-US"] || raw.description,
    description_localizations: {
      "en-US": EN_DESC[enName] || raw.description_localizations?.["en-US"] || raw.description,
      fr: FR_DESC[enName] || raw.description,
      "es-ES": ES_DESC[enName] || raw.description_localizations?.["es-ES"] || raw.description
    }
  };
  if (raw.default_member_permissions != null) {
    out.default_member_permissions = raw.default_member_permissions;
  }
  if (raw.dm_permission != null) out.dm_permission = raw.dm_permission;
  if (Array.isArray(raw.options) && raw.options.length) {
    out.options = raw.options.map(mapOption);
  }
  return out;
}

const body = commands.map((c) => mapCommand(c.data.toJSON()));
const outPath = path.join(root, "apps/web/public/docs/topgg-commands.json");
writeFileSync(outPath, JSON.stringify(body, null, 2));
console.log("wrote", outPath);
console.log("count", body.length);
for (const c of body) {
  console.log(`${c.name} | fr=${c.name_localizations.fr} | es=${c.name_localizations["es-ES"]}`);
}
