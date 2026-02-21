# Bot d’économie Discord

## Prérequis
- Node.js (version recommandée : 20 LTS)
- MySQL installé et démarré
- Application Discord (bot)

## Étapes détaillées

### 1. Créer l’application Discord
- Récupérer : `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`
- Scopes : `bot`, `applications.commands`, `identify`, `guilds`
- Générer l’URL d’invitation du bot

### 2. Configurer OAuth Discord (site)
- Ajouter l’URL de redirection OAuth :
  - `http://localhost:4000/auth/discord/callback`

### 3. Configurer MySQL
- Créer la base de données
- Importer les migrations
- Créer un utilisateur SQL dédié

### 4. Configurer les variables d’environnement
- Copier `.env.example` vers `.env` à la racine
- Renseigner les variables :
  - `DATABASE_URL`
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_CLIENT_ID`
  - `DISCORD_CLIENT_SECRET`
  - `DISCORD_REDIRECT_URI`
  - `API_SECRET_KEY`
  - `BASE_URL`
  - `API_BASE`

### 5. Lancer le projet
- Tout en une commande : `npm run dev:all`
- Ou séparément :
  - Backend : `npm run start`
  - Bot : `npm run bot`
  - Frontend : `npm run frontend`

## Première configuration (UI)
Une page “Première configuration” est disponible dans l’interface web :
- Vérification connexion DB
- Vérification Auth Discord (token)
- Vérification bot

## Assistant de démarrage (setup wizard)
Le dashboard propose un assistant avec les étapes suivantes :
1. Nom de l’économie + emoji
2. Argent de départ + limite max
3. Daily (montant + streak)
4. Activation des gains (message / vocal)
5. Configuration rapide d’un shop par défaut
6. Activation du leaderboard

Chaque étape est sauvegardée en base et modifiable ultérieurement.
