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

Les migrations ne lisent pas un fichier `.env` obligatoire sur Plesk : elles utilisent les **variables Node.js** du panel, injectées quand Plesk lance `npm start` / `server.js`.

> Un `npm run migrate` lancé à la main en SSH **n’a pas** les variables du panel — préférer **Restart app** après deploy, ou `export DATABASE_URL=...` avant la commande.

Plesk Application Node.js :

- Root = racine du repo
- Startup = `server.js` (ou `npm start`)
- Env = variables Node.js dans le panel (ou `.env` racine en local)

## Notes

- Recycle Plesk → reconnexion Discord (normal)
- Si le build Nuxt manque de RAM : builder en local/CI et uploader `apps/web/.output`
- Webhooks Stripe/Twitch : même domaine public que le site
