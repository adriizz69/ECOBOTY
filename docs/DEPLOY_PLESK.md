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
| **Fichier de démarrage** | `server.js` **ou** `.output/server/index.mjs` |
| **Mode** | `production` |

**Important :** la **racine de l'application** doit rester `/httpdocs`.  
Si tu mets la racine de l'application sur `.output/public`, Plesk **n'injecte pas** les variables Node.js → crash `Invalid environment`.

Les variables du panel Plesk ne sont **pas** disponibles en SSH (`node server.js` sans export). C'est normal.

## Variables d'environnement

Deux méthodes (une suffit) :

1. **Panel Plesk → Node.js → variables** (si racine application = `/httpdocs`)
2. **Fichier `/httpdocs/.env`** (recommandé si le panel ne passe pas les vars)

```bash
nano /var/www/vhosts/ecoboty.eu/httpdocs/.env
chmod 600 /var/www/vhosts/ecoboty.eu/httpdocs/.env
chown ecoboty.eu_rpf6do5lh5:psacln /var/www/vhosts/ecoboty.eu/httpdocs/.env
```

Copie les mêmes clés que dans le panel. Au démarrage, le serveur log :

```
[env] source=file (.env)
```

ou

```
[env] source=process (Plesk/Passenger)
```

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
