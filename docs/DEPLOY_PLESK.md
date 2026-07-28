# Déploiement Plesk — 1 process Node

## Principe

`apps/server` démarre :

1. API Express (`/api`, `/auth`, `/bot`, `/webhooks`, `/public`)
2. Client Discord (même process)
3. Frontend Nuxt depuis `.output/public` (copié depuis `apps/web/.output/public` au build)

## Commandes

```bash
npm ci
npm run build
# Puis « Restart app » dans Plesk
```

`npm run build` génère aussi :

- `.output/public/` — fichiers statiques (racine document Plesk possible)
- `.output/server/index.mjs` — wrapper Passenger vers le vrai serveur

## Plesk Node.js — réglages critiques

| Paramètre | Valeur |
|---|---|
| **Racine de l'application** | `/httpdocs` |
| **Racine du document** | `/httpdocs/.output/public` *(optionnel)* ou `/httpdocs` |
| **Fichier de démarrage** | `server.js` **ou** `bootstrap.cjs` (les deux pointent vers le même serveur) |
| **Mode** | `production` |

**Important :** la **racine de l'application** doit rester `/httpdocs`.  
Si tu mets la racine de l'application sur `.output/public`, Plesk **n'injecte pas** les variables Node.js → crash `Invalid environment`.

Les variables du panel Plesk ne sont **pas** disponibles en SSH (`node server.js` sans export). C'est normal.

## Variables d'environnement (Plesk uniquement — pas de `.env` en prod)

Plesk injecte les variables du panel **directement** dans `process.env` quand Passenger lance le fichier de démarrage.  
Il n'existe **pas** de fichier `.env` qui « redirige » vers Plesk : c'est Passenger qui passe les vars à Node.

Conditions pour que ça marche :

| Paramètre | Valeur |
|---|---|
| **Racine de l'application** | `/httpdocs` |
| **Fichier de démarrage** | `server.js` |
| **Racine du document** | `/httpdocs/.output/public` *(optionnel)* |

Puis **Restart app** dans Node.js, et si besoin **redémarrer Apache** (Services → Apache).

Vérifier que Plesk a bien écrit les vars pour Passenger (SSH) :

```bash
grep -r "PassengerEnvVar\|DATABASE_URL" /var/www/vhosts/system/ecoboty.eu/conf/ 2>/dev/null | head -20
```

Si cette commande ne retourne rien → le panel Node.js n'est pas lié au bon domaine/racine.

Au démarrage, le log doit afficher :

```
[env] source=process (Plesk/Passenger)
```

Les variables du panel ne sont **pas** visibles en SSH (`node server.js` sans export) — seulement via Passenger.

Fichier `.env` : réservé au **local** (`NODE_ENV=development`). En prod, ne pas créer de `.env` sur le serveur.

## Migrations

Exécutées au démarrage de l'app (`runMigrations()`), pas en SSH.

Manuel en SSH seulement si besoin :

```bash
export DATABASE_URL='mysql://...'
npm run migrate
```

## Notes

- Recycle Plesk → reconnexion Discord (normal)
- Si le build Nuxt manque de RAM : builder en local/CI et uploader `.output/public`
- Webhooks Stripe/Twitch : même domaine public que le site
