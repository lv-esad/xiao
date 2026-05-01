# Instructions de Déploiement : PWA Change RMB/EUR

Ce document décrit comment déployer l'application "Change RMB/EUR" en production pour garantir le fonctionnement de la PWA sur iOS (qui requiert impérativement le HTTPS).

L'application est divisée en deux parties : le Backend (Node.js/Express) et le Frontend (React/Vite).

## 1. Déploiement du Backend (Serveur API)

Le backend peut être déployé sur un service cloud comme **Render**, **Heroku**, ou un **VPS** classique (DigitalOcean, OVH).

### Option Recommandée : Render (Gratuit / Peu coûteux)

1. Créez un compte sur [Render.com](https://render.com/).
2. Créez un nouveau **Web Service**.
3. Liez votre dépôt GitHub (contenant le dossier `backend`).
4. Configuration :
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `node server.js`
5. Variables d'environnement (Environment Variables) :
   - `PORT` : `3001` (ou laissez Render choisir)
   - `JWT_SECRET` : Générez une chaîne longue et aléatoire pour sécuriser les tokens.
6. Cliquez sur "Create Web Service". Render fournira une URL (ex: `https://votre-backend.onrender.com`).

*Note sur SQLite en production* : SQLite écrit dans un fichier local. Sur des plateformes comme Render (Free tier) ou Heroku, le système de fichiers est éphémère (effacé à chaque redémarrage). Si vous souhaitez conserver les données de façon permanente, il faudra soit attacher un disque persistant, soit migrer vers PostgreSQL (supporté par Render).

## 2. Déploiement du Frontend (PWA React)

Le frontend doit être hébergé sur un CDN HTTPS. **Vercel** ou **Netlify** sont d'excellentes options gratuites et très rapides.

### Étape Préalable : Configurer l'URL du Backend

Avant de déployer, vous devez indiquer au frontend où se trouve l'API en production.
Dans Vercel ou Netlify, vous pouvez le faire sans toucher au code en modifiant les variables d'environnement si vous aviez utilisé `import.meta.env`, mais puisque nous utilisons un proxy Vite en développement, la meilleure méthode pour la production est :

1. Dans `frontend/vite.config.js`, le proxy ne fonctionne qu'en mode dev.
2. Pour la production, configurez une variable d'environnement ou configurez Axios pour utiliser l'URL complète du backend.
   *Exemple (dans un fichier `axios.js` ou dans `main.jsx`) :*
   ```javascript
   axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
   ```

### Option Recommandée : Vercel

1. Créez un compte sur [Vercel](https://vercel.com).
2. Importez votre dépôt GitHub.
3. Configurez le projet :
   - **Framework Preset** : Vite
   - **Root Directory** : `frontend` (Important !)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. Variables d'environnement :
   - `VITE_API_URL` : `https://votre-backend.onrender.com` (l'URL de votre backend Render).
5. Cliquez sur **Deploy**.

Vercel fournira une URL HTTPS sécurisée (ex: `https://change-rmb-eur.vercel.app`).

## 3. Configuration iOS PWA

Une fois le frontend déployé en HTTPS :

1. Ouvrez **Safari** sur votre iPhone.
2. Allez sur l'URL de votre application (ex: `https://change-rmb-eur.vercel.app`).
3. Appuyez sur le bouton **Partager** (le carré avec la flèche vers le haut).
4. Faites défiler vers le bas et sélectionnez **"Sur l'écran d'accueil"** (Add to Home Screen).
5. Appuyez sur **Ajouter**.

L'application est maintenant sur l'écran d'accueil de l'iPhone. En l'ouvrant, elle se lancera en plein écran (Edge-to-Edge), sans l'interface de Safari, avec les couleurs Fintech que nous avons configurées.

## 4. Remarques sur les Notifications Push (iOS)

Les notifications Web Push sur iOS ne fonctionnent **que** si l'application a été ajoutée à l'écran d'accueil (PWA installée) et que l'iPhone est sous **iOS 16.4 ou supérieur**.
Pour l'implémentation complète des Push (envoyer des messages depuis le serveur), il faudra :
1. Générer des clés VAPID (`npx web-push generate-vapid-keys`).
2. Ajouter ces clés au Backend (`web-push.setVapidDetails()`).
3. Envoyer la souscription du Service Worker Frontend vers le Backend.
La logique est préparée dans le composant `Alerts.jsx`, mais nécessite ces clés de production pour fonctionner réellement.
