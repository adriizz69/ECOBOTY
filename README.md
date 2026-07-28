# EcoBoty

Bot Discord d’économie + dashboard web.  
**1 repo · 1 process Node** (API + bot + front).

## Structure

```
apps/web        Nuxt 4 + Nuxt UI
apps/server     Entry unique (Express + Discord + static)
packages/core   API + métier
packages/db     Migrations MySQL (Knex)
packages/config Validation .env
docs/           Déploiement & env
server.js       Point d’entrée Plesk
```

## Démarrage

```bash
cp .env.example .env
npm ci
npm run migrate
npm run build
npm start
```

Dev avec HMR front :

```bash
npm run dev:all
```

Un seul `.env` à la racine — détails : [docs/ENV.md](docs/ENV.md).

## Admin & Premium

- Admin : `/admin-v2` uniquement (`/admin` redirige)
- Premium v2 : Free / Premium / Premium+ — `PREMIUM_FEATURE_ENFORCEMENT_MODE=off|warn|enforce`

## Un seul site

Tout sur **https://ecoboty.eu** (plus d’API sur un sous-domaine).  
→ [docs/SINGLE_SITE.md](docs/SINGLE_SITE.md) · [docs/PROD.md](docs/PROD.md) · [docs/DEPLOY_PLESK.md](docs/DEPLOY_PLESK.md)
