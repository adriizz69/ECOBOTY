# Production readiness

## Architecture cible

- **1 git** (ce monorepo)
- **1 site** `https://ecoboty.eu`
- **1 process Node** (`server.js` → API + bot + SPA)

## Commandes

```bash
npm ci
npm run migrate
npm run build    # SPA same-origin (API_BASE forcé vide)
npm start
npm run smoke    # smoke local sans bot Discord
```

Plesk : Application Node → startup `server.js`, root = repo.

## `.env` prod

```env
NODE_ENV=production
PORT=4000
BASE_URL=https://ecoboty.eu
API_BASE=
DISCORD_REDIRECT_URI=https://ecoboty.eu/auth/discord/callback
DISCORD_PUBLIC_KEY=... # Developer Portal → General Information
TWITCH_REDIRECT_URI=https://ecoboty.eu/auth/twitch/callback
TWITCH_EVENTSUB_CALLBACK=https://ecoboty.eu/twitch/eventsub
PREMIUM_FEATURE_ENFORCEMENT_MODE=warn
```

Puis `enforce` après validation.

## Hors code (une fois)

1. Discord OAuth redirect → `ecoboty.eu`
2. Discord Event Webhooks → `https://ecoboty.eu/webhooks/discord` + event `APPLICATION_DEAUTHORIZED` (+ `DISCORD_PUBLIC_KEY` dans `.env`)
3. Migration `091` + redémarrage API (sync auto des déliaisons Twitch dans Connexions Discord)
4. Twitch OAuth + EventSub → `ecoboty.eu`
5. Stripe webhook → `https://ecoboty.eu/webhooks/stripe`
4. Couper `api.ecoboty.eu` + bot VPS + anciens repos

## Vérifs smoke

- `GET /health` → `{ ok: true, mode: "unified" }`
- `GET /` → SPA
- `GET /guild/<id>` → SPA fallback (pas 404 nginx)
- Login Discord → `/callback` → `/servers` (ou redirect conservé)
- Admin → `/admin-v2`
- Bot connecté (logs `[bot] Discord client started`)

Voir aussi [SINGLE_SITE.md](SINGLE_SITE.md), [DEPLOY_PLESK.md](DEPLOY_PLESK.md), [CUTOVER.md](CUTOVER.md).
