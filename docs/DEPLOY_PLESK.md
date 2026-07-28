# Déploiement Plesk — 1 process Node

## Principe

`apps/server` démarre :

1. API Express (`/api`, `/auth`, `/bot`, `/webhooks`, `/public`)
2. Client Discord (même process)
3. Frontend Nuxt depuis `apps/web/.output/public`

## Commandes

```bash
npm ci
npm run build
npm start   # exécute aussi les migrations (prestart)
```

Sur Plesk, **ne lance pas** `npm run migrate` en SSH : les variables du panel ne sont pas disponibles dans le terminal.

Les migrations s'exécutent **au démarrage** de l'app (`server.js` / Restart app), avec les variables Node.js Plesk.

```bash
npm ci
npm run build
# Puis « Restart app » dans Plesk
```

Si tu dois migrer à la main en SSH : `export DATABASE_URL='mysql://...'` puis `npm run migrate`.

Plesk Application Node.js :

- Root = racine du repo
- Startup = `server.js` (ou `npm start`)
- Env = variables Node.js dans le panel (ou `.env` racine en local)

## Notes

- Recycle Plesk → reconnexion Discord (normal)
- Si le build Nuxt manque de RAM : builder en local/CI et uploader `apps/web/.output`
- Webhooks Stripe/Twitch : même domaine public que le site
