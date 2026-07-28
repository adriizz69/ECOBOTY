# Cutover — un site, un Node, un git

## Avant

1. Backup MySQL
2. Staging Plesk si possible
3. Smoke : `/health`, login Discord, `/daily`, `/admin-v2`, webhook Stripe
4. `PREMIUM_FEATURE_ENFORCEMENT_MODE=warn` puis `enforce`

## Bascule

1. Pointer **ecoboty.eu** vers l’app Node unifiée (`server.js`) — plus d’`api.ecoboty.eu`
2. Mettre à jour OAuth Discord + Twitch + Stripe sur `https://ecoboty.eu/...` (voir [SINGLE_SITE.md](SINGLE_SITE.md))
3. `.env` prod : `BASE_URL=https://ecoboty.eu`, `API_BASE=` (vide)
4. Arrêter le bot VPS + anciennes apps Plesk
5. Archiver / supprimer les anciens dépôts git

## Après

- Checklist : économie, shop, jeux, succès, anniversaires, Twitch, giveaways, premium, admin-v2
- Surveiller reconnect Discord + Stripe 24h

## Rollback

Relancer l’ancien bot VPS + anciennes apps, rétablir DNS. La base MySQL reste compatible.
