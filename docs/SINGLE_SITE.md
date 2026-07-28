# Un seul site : https://ecoboty.eu

## Objectif

| Avant | Après |
|---|---|
| `ecoboty.eu` (front) + `api.ecoboty.eu` (API) | **uniquement `ecoboty.eu`** |
| Bot sur VPS séparé | Bot dans le même Node |
| 2–3 dépôts git | **1 dépôt** |

Tout passe par le même process Node :

```
https://ecoboty.eu/           → Nuxt (pages)
https://ecoboty.eu/api/...    → API
https://ecoboty.eu/auth/...   → OAuth Discord / Twitch
https://ecoboty.eu/bot/...    → routes internes bot
https://ecoboty.eu/webhooks/stripe → Stripe
https://ecoboty.eu/twitch/... → EventSub Twitch
https://ecoboty.eu/health     → healthcheck
```

Le front appelle l’API en **same-origin** (`API_BASE` vide en prod).

## Config prod (.env sur Plesk)

```env
BASE_URL=https://ecoboty.eu
API_BASE=
DISCORD_REDIRECT_URI=https://ecoboty.eu/auth/discord/callback
TWITCH_REDIRECT_URI=https://ecoboty.eu/auth/twitch/callback
TWITCH_EVENTSUB_CALLBACK=https://ecoboty.eu/twitch/eventsub
```

## À changer hors du code (une fois)

1. **Discord Developer Portal**  
   Redirects OAuth : `https://ecoboty.eu/auth/discord/callback`  
   (retirer `api.ecoboty.eu`)

2. **Twitch Console**  
   OAuth redirect : `https://ecoboty.eu/auth/twitch/callback`  
   Resubscribe EventSub avec le nouveau callback

3. **Stripe**  
   Webhook endpoint : `https://ecoboty.eu/webhooks/stripe`

4. **DNS / Plesk**  
   - `ecoboty.eu` → Application Node (ce repo, `server.js`)  
   - `api.ecoboty.eu` → à désactiver (ou redirection 301 vers `ecoboty.eu` temporairement)

5. **Anciens repos git** → archiver / supprimer après bascule

## Git

Un seul remote sur ce monorepo. Plus de subtree front/back/bot.
