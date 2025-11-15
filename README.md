# The Soulset Navigator — V5 (Connected IA)

Date: 2025-11-11T11:08:50.166399

## Ce que c'est
Une version **connectée** de The Soulset Navigator.  
- Frontend statique (index.html) — UI vivante, thème vif.
- API serverless `/api/analyze` — appelle le modèle **OpenAI** (chat completions) avec un prompt **SoulsetJourney**.
- **Aucune clé en front** : la variable `OPENAI_API_KEY` est stockée côté serveur (Vercel).

## Déploiement (Vercel recommandé)
1. Créez un projet sur [Vercel].
2. Ajoutez la variable d'environnement **OPENAI_API_KEY** (Settings → Environment Variables).
3. Déployez ce dossier (ou `vercel deploy`).  
   Les routes sont configurées via `vercel.json` :
   - `/api/health`
   - `/api/analyze`

## Test local
- Installer l'outil vercel (`npm i -g vercel`), puis:  
  ```bash
  vercel dev
  ```
- Ajoutez `OPENAI_API_KEY` via `vercel env add` ou export local.

## Personnalisation
- **Ton & structure de réponse** : éditez `SYSTEM_PROMPT` dans `api/analyze.js`.
- **Modèle** : `model: "gpt-4o-mini"` — adaptez selon vos accès.
- **Suggestion produit** : heuristiques simples en bas de `api/analyze.js` (basées sur des mots-clés), ou remplacez par un **catalogue** issu de votre boutique.
- **UI** : style dans `index.html` (palette, gradients, composants).

## Sécurité
- Ne mettez **jamais** de clé API dans le front. Utilisez **exclusivement** la route serverless.

—


## Dépannage rapide (Vercel)
1) **Clé API manquante** : ajoutez `OPENAI_API_KEY` dans *Settings → Environment Variables* (Production ET Preview si besoin), puis redeploy.
2) **Routes API** : `vercel.json` doit contenir `/api/analyze` et `/api/health`.
3) **Logs Vercel** : onglet *Logs* → recherchez `Missing OPENAI_API_KEY` ou `OpenAI API error` (détails renvoyés dans `detail`).
4) **CORS** : non nécessaire en même domaine (front + API sur la même origine).
5) **Modèle** : si `gpt-4o-mini` n’est pas accessible dans votre compte, essayez `gpt-4o`.
