Oui. Le meilleur moyen de démarrer proprement avec VS Code + Claude Sonnet, c’est de suivre un plan en **petites étapes validables**, en construisant d’abord le **socle desktop**, puis le **sidecar**, puis **SQLite**, puis **Mastra**, puis enfin la **boucle de jeu**. Tauri recommande de créer le projet via `create-tauri-app`, avec Vite pour les SPA comme Vue, et Mastra fournit un point d’entrée simple pour créer des agents TypeScript. [v2.tauri](https://v2.tauri.app/start/create-project/)

## Stratégie générale

Je te conseille de travailler en **vertical slices** plutôt qu’en “gros chantier backend puis gros chantier frontend”. En clair, tu montes d’abord une app qui **s’ouvre**, puis une app qui **parle à un sidecar**, puis une app qui **lit/écrit en base**, puis une app qui **fait un premier appel LLM local**. Cette approche limite les zones floues et te donne un projet testable très tôt. [mastra](https://mastra.ai/docs)

L’autre point important : avec Claude Sonnet dans VS Code, fais-le surtout travailler sur des tâches **courtes, bornées et vérifiables**, pas sur “construis tout le backend”. Mastra et Tauri ont des setups assez sensibles; mieux vaut avancer fichier par fichier, module par module. [v2.tauri](https://v2.tauri.app/start/create-project/)

## Étape 1 : préparer l’environnement

Avant de coder, installe et valide :
- **VS Code**
- **Node.js LTS**
- **pnpm** ou npm
- **Rust** pour Tauri
- **les prérequis Tauri de ton OS**
- **Git**
- **LM Studio** si tu veux tester rapidement un endpoint local OpenAI-compatible. Tauri fournit les guides de création de projet et de configuration frontend, et l’AI SDK documente l’usage de LM Studio comme serveur local compatible OpenAI. [v2.tauri](https://v2.tauri.app/start/frontend/)

Dans VS Code, installe au minimum :
- Vue Language Features / Volar
- ESLint
- Prettier
- rust-analyzer
- l’extension Claude / l’outil que tu utilises pour Sonnet

## Étape 2 : créer le repository

Crée un dépôt Git dès le début avec :
- branche `main`
- branche de travail `dev`
- `.editorconfig`
- `.gitignore`
- `README.md`
- `docs/vision.md`

L’objectif ici est de poser noir sur blanc :
- la vision du produit,
- le scope V1,
- ce que tu ne fais pas maintenant,
- ton architecture cible.

### Contenu minimal de `docs/vision.md`
- But du produit
- Contraintes : desktop, local-first, sans Python
- Stack retenue : Tauri, Vue, Node sidecar, SQLite, Mastra, runtime local OpenAI-compatible
- Scope V1 : une campagne, une scène, un tour de jeu textuel, persistance locale

## Étape 3 : créer l’app desktop Tauri + Vue

Commence par générer le shell de l’application. Tauri recommande `create-tauri-app`, et recommande aussi Vite pour les frameworks SPA comme Vue. [v2.tauri](https://v2.tauri.app/start/frontend/)

### Objectif
À la fin de cette étape, tu dois avoir :
- une fenêtre desktop qui s’ouvre,
- une app Vue qui compile,
- un lancement en mode dev qui marche.

### Résultat attendu
- `apps/desktop`
- `src-tauri`
- `pnpm tauri dev` ou équivalent fonctionne

### Ce que tu demandes à Claude
Demande-lui par exemple :
- “Aide-moi à initialiser un projet Tauri v2 avec Vue 3 + TypeScript + Vite.”
- “Propose une structure minimale propre pour un frontend Tauri Vue.”
- “Ajoute ESLint + Prettier + scripts de dev.”

## Étape 4 : transformer le repo en monorepo simple

Très tôt, passe en structure monorepo, sinon tu vas tout déplacer plus tard.

### Structure cible initiale
```text
project-root/
├─ apps/
│  ├─ desktop/
│  └─ sidecar/
├─ packages/
│  ├─ shared/
│  ├─ domain/
│  └─ rules-engine/
├─ assets/
├─ data/
└─ docs/
```

### Pourquoi maintenant
Parce que tu veux :
- partager les types entre frontend et sidecar,
- isoler le moteur de règles,
- garder le sidecar indépendant.

## Étape 5 : créer le sidecar Node/TypeScript

Tauri documente explicitement le fait qu’un sidecar Node peut être utilisé et packagé comme binaire autonome. [v2.tauri](https://v2.tauri.app/learn/sidecar-nodejs/)

### Objectif
Créer un petit serveur local TypeScript qui :
- démarre,
- répond sur `127.0.0.1`,
- expose `/health`,
- peut être lancé séparément d’abord.

### Stack conseillée
- Node.js
- TypeScript
- Fastify
- Zod
- pino pour les logs

### Résultat attendu
Quand tu lances le sidecar :
- `GET /health` retourne `{ ok: true }`

### Ce que tu demandes à Claude
- “Crée un sidecar Fastify TypeScript minimal avec route `/health`.”
- “Ajoute validation Zod et structure `src/api`, `src/core`, `src/config`.”
- “Prépare les scripts `dev`, `build`, `start`.”

## Étape 6 : connecter le desktop au sidecar

Avant Mastra, avant SQLite, tu dois prouver que l’app desktop parle au sidecar.

### Objectif
Depuis Vue :
- appeler `GET /health`
- afficher le statut “backend OK”

### À faire
- créer un `sidecarApiClient`
- créer un `SystemStatusCard.vue`
- afficher l’état dans l’écran d’accueil

### Résultat attendu
Tu lances l’app + le sidecar, et l’UI affiche :
- Backend connecté
- URL locale
- version sidecar

## Étape 7 : intégrer le lancement du sidecar depuis Tauri

Une fois le sidecar stable en mode séparé, intègre son lancement depuis Tauri. Tauri indique que le sidecar doit être déclaré comme binaire externe et peut être lancé par l’application. [v2.tauri](https://v2.tauri.app/fr/learn/sidecar-nodejs/)

### Objectif
Au lancement de l’app :
- Tauri lance le sidecar
- l’UI attend le healthcheck
- si KO, affiche un écran de diagnostic

### Important
Ne cherche pas à tout packager parfaitement tout de suite. En dev, tu peux d’abord lancer le sidecar à la main, puis ensuite automatiser.

## Étape 8 : créer les packages partagés

Maintenant que le socle tourne, crée les packages partagés.

### `packages/shared`
- DTO API
- types communs
- enums
- utilitaires simples

### `packages/domain`
- types métier : Campaign, Scene, Character, Turn, MemoryFact

### `packages/rules-engine`
- logique pure sans dépendance infra

### Résultat attendu
Le frontend et le sidecar importent les mêmes types.

## Étape 9 : mettre en place SQLite

Tu as besoin très tôt d’une vraie persistance. Même si le jeu n’est pas prêt, pose la base maintenant. Une base locale structurée est essentielle pour que l’état du monde ne dépende pas du prompt. [node:sqlite](https://nodejs.org/api/sqlite.html)

### Stack
- SQLite
- `node:sqlite`

### structurer
```text
apps/sidecar/src/db/
├─ database.ts
├─ migrations.ts
├─ statements/
├─ repositories/
└─ transactions.ts
```
Avec :
- database.ts pour l’ouverture du fichier SQLite,
- migrations.ts pour appliquer les schémas,
- un repository par agrégat (CampaignRepository, SceneRepository, TurnRepository),
- et des statements préparés réutilisables.

### Objectif
Créer :
- la DB locale,
- les migrations,
- un repository minimal,
- une première entité `campaigns`.

### campaigns schema
- `id`
- `name`
- `system`
- `setting`
- `current_scene_id`
- `created_at`
- `updated_at`

### Résultat attendu
Tu peux :
- créer une campagne
- la relire
- l’afficher dans l’UI

### Ce que tu demandes à Claude
- “Crée une couche SQLite avec better-sqlite3 et un système simple de migrations.”
- “Ajoute CampaignRepository avec create/list/getById.”
- “Expose une route POST/GET campaigns.”

## Étape 10 : construire la première boucle métier sans IA

C’est une étape très importante : faire marcher un **tour de jeu sans LLM**.

### Objectif
L’utilisateur :
- saisit une action,
- le backend crée un tour,
- le moteur de règles fait un traitement simple,
- une narration statique est renvoyée.

### Pourquoi
Parce que ça te permet de valider :
- API,
- persistance,
- flow UI,
- structures métier,
sans brouiller le debug avec le LLM.

### Exemple
Entrée :
- “J’ouvre la porte”

Sortie :
- `intent = interact.open`
- `result = success`
- narration simple générée côté code

## Étape 11 : intégrer LM Studio comme backend LLM local

LM Studio expose un serveur local compatible OpenAI, utilisable avec l’AI SDK via `@ai-sdk/openai-compatible`. [ai-sdk](https://ai-sdk.dev/v5/providers/openai-compatible-providers/lmstudio)

### Objectif
Depuis le sidecar :
- healthcheck du serveur LM Studio
- récupération de `/v1/models`
- premier prompt de test

### Résultat attendu
Une route comme `/llm/test` retourne un texte généré localement.

### Ce que tu demandes à Claude
- “Crée un provider OpenAI-compatible TypeScript pour LM Studio.”
- “Ajoute un healthcheck sur `/v1/models`.”
- “Ajoute une route de test qui envoie un prompt simple.”

## Étape 12 : ajouter Mastra

Une fois le LLM local testé hors workflow, tu ajoutes Mastra. Mastra se présente comme un framework TypeScript pour agents, outils et workflows. [mastra](https://mastra.ai)

### Objectif
Créer un premier agent très simple :
- `narratorAgent`

Puis un premier workflow :
- `resolveTurnWorkflow`

### Résultat attendu
Le workflow reçoit :
- action joueur
- contexte scène
- état minimal

et renvoie :
- narration

### Important
N’intègre pas 4 agents d’un coup. Commence avec **un seul agent**.

## Étape 13 : définir les tools Mastra

Les outils doivent être strictement bornés.

### Commence avec seulement 3 tools
- `loadSceneTool`
- `getRecentTurnsTool`
- `rollDiceTool`

### Pourquoi
Tu dois prouver le concept tool-first sans ouvrir trop de surface.

### Règle
Les agents :
- lisent via des tools
- demandent des opérations
- ne manipulent pas directement SQLite

## Étape 14 : créer le vrai `resolveTurnWorkflow`

Quand le narrateur simple marche, tu peux structurer le workflow principal.

### Pipeline V1
1. charger campagne
2. charger scène
3. charger contexte récent
4. interpréter l’intention
5. résoudre règles minimales
6. générer narration
7. sauvegarder tour
8. renvoyer résultat UI

### À ce stade
L’agent peut être unique, avec un peu de logique métier codée autour.

## Étape 15 : construire le moteur de règles minimal

Ne commence pas par D&D complet.

### Scope initial conseillé
- actions libres
- checks simples
- succès / échec
- HP basiques
- inventaire léger
- flags de scène

### But
Créer un système **jouable** avant un système **complet**.

## Étape 16 : créer l’UI de table de jeu

Quand la boucle backend existe, construis l’écran principal.

### L’écran doit contenir
- historique des tours
- champ d’action joueur
- scène active
- panneau personnages
- statut backend / modèle

### Résultat attendu
Tu peux lancer une mini partie locale textuelle.

## Étape 17 : ajouter mémoire et résumés

Mastra supporte la mémoire, mais garde aussi une mémoire métier en base. [mastra](https://mastra.ai/docs/agents/agent-memory/llms.txt)

### Ce que tu mets en place
- résumé des 10 derniers tours
- faits importants stockés en DB
- récupération du contexte utile avant narration

### Ne fais pas tout de suite
- mémoire vectorielle compliquée
- RAG exotique
- système trop général

## Étape 18 : audio et TTS

Seulement quand la boucle texte marche bien.

### Commence par
- lecture TTS du MJ
- une ambiance par scène
- un SFX ponctuel

### Évite au début
- système audio adaptatif complexe
- mixage avancé
- génération audio IA

## Étape 19 : packaging dev propre

À ce stade, commence à stabiliser :
- scripts de build
- build du sidecar
- copie du sidecar dans Tauri
- config de lancement

### Objectif
Pouvoir lancer le projet avec une seule commande.

## Étape 20 : docs projet pour Claude Sonnet

Tu vas beaucoup gagner si tu prépares un contexte permanent pour l’assistant.

### Crée ces fichiers
- `docs/vision.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/coding-standards.md`
- `docs/domain-model.md`

### Dans `coding-standards.md`
- TS strict
- Zod sur toutes les entrées
- pas de logique métier dans Vue
- pas d’accès DB direct depuis les agents
- repository pattern
- tests sur le moteur de règles

## Étape 21 : façon de travailler avec Claude

Le meilleur usage est de lui donner :
1. le contexte d’un dossier,
2. un objectif très précis,
3. des critères d’acceptation,
4. les fichiers à modifier.

### Bon exemple de prompt
“Tu travailles sur `apps/sidecar`. Crée une route `POST /campaigns` avec validation Zod, implémente `CampaignRepository.create`, ajoute un test d’intégration minimal, n’ajoute pas d’autre fonctionnalité.”

### Mauvais exemple
“Construis tout le backend de mon jeu.”

## Étape 22 : ordre réel que je te conseille

Voici l’ordre exact que je te recommande :

1. Initialiser Git + docs projet. [v2.tauri](https://v2.tauri.app/start/create-project/)
2. Générer Tauri + Vue + TS. [v2.tauri](https://v2.tauri.app/start/frontend/)
3. Passer en monorepo.
4. Créer sidecar Fastify TS.
5. Faire `GET /health`.
6. Connecter l’UI au sidecar.
7. Ajouter SQLite + migrations.
8. Créer `campaigns`.
9. Créer écran Home avec liste campagnes.
10. Implémenter une boucle de tour **sans LLM**.
11. Installer LM Studio et tester `/v1/models`. [lmstudio](https://lmstudio.ai/docs/developer/openai-compat)
12. Ajouter provider OpenAI-compatible.
13. Ajouter Mastra avec un seul agent. [workos](https://workos.com/blog/mastra-ai-quick-start)
14. Créer `resolveTurnWorkflow`.
15. Ajouter mémoire minimale.
16. Ajouter UI table de jeu.
17. Ajouter TTS.
18. Stabiliser packaging sidecar Tauri. [v2.tauri](https://v2.tauri.app/fr/learn/sidecar-nodejs/)
19. Ajouter import scénario ensuite, pas avant.

## MVP concret

Ton **MVP réel** devrait être :
- une app desktop qui démarre,
- une campagne sauvegardée en SQLite,
- un écran de jeu,
- un champ d’action,
- un workflow Mastra simple,
- un modèle local via LM Studio,
- une narration renvoyée,
- persistance des tours.

C’est déjà un énorme jalon.

## Mon conseil final

Ne commence **ni par le PDF import**, **ni par plusieurs agents**, **ni par un système de règles complexe**. Commence par **une boucle de jeu locale minimaliste mais complète**, de l’UI jusqu’au modèle local. C’est le chemin le plus court vers quelque chose de concret et débogable avec VS Code + Claude Sonnet. Tauri, Mastra et LM Studio ont tous un chemin d’entrée simple qui favorise cette progression incrémentale. [mastra](https://mastra.ai/docs)

Si tu veux, je peux te faire juste après un **plan de travail sur 10 jours**, ou directement te donner le **tout premier prompt à coller à Claude Sonnet** pour initialiser proprement le repo.