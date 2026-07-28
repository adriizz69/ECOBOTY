# Déploiement Plesk — 1 process Node

## Principe

`apps/server` démarre :

1. API Express (`/api`, `/auth`, `/bot`, `/webhooks`, `/public`)
2. Client Discord (même process)
3. Frontend Nuxt depuis `apps/web/.output/public`

## Commandes

```bash
npm ci
npm run migrate
npm run build
npm start
```

Plesk Application Node.js :

- Root = racine du repo
- Startup = `server.js` (ou `npm start`)
- Env = fichier `.env` racine (voir [ENV.md](ENV.md))

## Notes

- Recycle Plesk → reconnexion Discord (normal)
- Si le build Nuxt manque de RAM : builder en local/CI et uploader `apps/web/.output`
- Webhooks Stripe/Twitch : même domaine public que le site
