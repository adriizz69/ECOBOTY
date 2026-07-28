# Variables d'environnement

Un seul fichier : **`.env` à la racine**.

## Utiles (gardées)

| Variable | Rôle |
|---|---|
| `NODE_ENV` / `PORT` | Runtime |
| `BASE_URL` | Site public (`https://ecoboty.eu`) |
| `API_BASE` | Front→API. **Vide en prod** (same-origin). Local: `http://localhost:4000` |
| `API_SECRET_KEY` | JWT + auth bot interne |
| `API_JWT_TTL` | Durée JWT |
| `PREMIUM_FEATURE_ENFORCEMENT_MODE` | `off` / `warn` / `enforce` |
| `ADMIN_USER_IDS` | Admins Discord |
| `ADSENSE_CLIENT` / `TAWK_TO_WIDGET_URL` | Widgets front |
| `DATABASE_URL` | MySQL |
| `DISCORD_*` | Bot + OAuth |
| `TWITCH_*` | Optionnel (module Twitch) |

## Inutile / à ne plus utiliser

- `API_BASE=api.ecoboty.eu` → remplacé par same-origin
- `BASE_URL=ecoboty.eu` sans `https://` → toujours `https://ecoboty.eu`
- `AUTH0_*` → non utilisé
- Anciens `.env` front/back séparés

## Prod (commenté dans `.env`)

```env
BASE_URL=https://ecoboty.eu
API_BASE=
DATABASE_URL=mysql://…@localhost:3306/discord_economy
DISCORD_REDIRECT_URI=https://ecoboty.eu/auth/discord/callback
```

Mot de passe MySQL : encoder `*` en `%2A` dans l’URL.
