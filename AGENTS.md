# AGENTS.md

## Langue

**Réponds toujours en français**, quelle que soit la langue utilisée dans les messages ou les fichiers du dépôt.

Dans le code, tous les identifiants (noms de fonctions, classes, variables, paramètres, fichiers) sont **toujours écrits en anglais**. Seuls les commentaires, messages utilisateur et textes d'interface peuvent être en français si le contexte le justifie.

---

## Description du projet

Application desktop locale d'aide au jeu de rôle sur table, assistée par IA. Un shell Tauri (Rust) embarque un sidecar Node.js (Fastify + Mastra) qui communique avec un runtime LLM local (llama.cpp / LM Studio). Aucune dépendance cloud.

**Tous les docs et identifiants métier sont en français** (MJ = Maître de Jeu).

---

## Prérequis

- Node ≥ 24.0.0 (utilise `node:sqlite`, le flag `--env-file`)
- pnpm 10.33.0 (imposé via le champ `packageManager`)
- Toolchain Rust (pour Tauri / `src-tauri`)

---

## Structure du monorepo

```
apps/desktop     → @open-lore-warden/desktop  (Vue 3 + shell Tauri)
apps/sidecar     → @open-lore-warden/sidecar  (API Fastify + agents Mastra)
packages/domain        → schémas Zod + types TypeScript du domaine
packages/rules-engine  → logique dés/combat/compétences en TS pur (zéro dép. infra)
packages/llm-provider  → résolution d'alias de modèles, vérification santé LLM
packages/shared        → type Result<T,E>, enums, schéma HealthResponse
```

Filtre de paquet : `pnpm --filter <package-name>` (ex. `pnpm --filter sidecar`).

---

## Commandes principales

```bash
# Dev complet (sidecar + desktop en parallèle, PAS le shell natif Tauri)
pnpm dev

# Processus dev individuels
pnpm dev:sidecar   # serveur API Node.js sur :3000
pnpm dev:desktop   # serveur dev Vite sur :1420

# Dev Tauri natif (plus lent, ouvre une vraie fenêtre desktop)
pnpm dev:tauri

# Vérification des types sur tous les paquets
pnpm typecheck

# Lint (config ESLint flat)
pnpm lint
pnpm lint:fix

# Formatage
pnpm format        # écrit en place
pnpm format:check  # vérification style CI

# Build tout
pnpm build
```

Aucun framework de test n'est configuré. Il n'existe aucun fichier ni script de test.

---

## Pipeline de build du sidecar (ordre important)

```bash
pnpm --filter sidecar build:sidecar
```

Exécute quatre étapes en séquence :
1. `tsc` — vérification des types
2. `esbuild` — bundle vers `dist/bundle.cjs` (CJS, platform=node, target=node24)
3. `@yao-pkg/pkg` — compile en binaire standalone `sidecar`
4. `rename-binary.js` — exécute `rustc --print host-tuple`, copie le binaire vers `apps/desktop/src-tauri/binaries/sidecar-<triple>[.exe]`

Le binaire doit être dans `src-tauri/binaries/` avant l'exécution de `tauri:build`.

---

## Environnement

Le fichier `.env` à la racine est **commité** (pas besoin de `.env.example`). Le sidecar le lit via `node --env-file=../../.env`. Tauri le lit via `dotenvy` au runtime.

Variables clés :
```
PORT=3000          # port HTTP du sidecar
HOST=127.0.0.1
DATA_DIR=./data    # SQLite à DATA_DIR/mj.db
LLM_HOST=127.0.0.1
LLM_PORT=8080      # runtime LLM local (LM Studio / llama-server)
# LLM_MODEL_INTENT / NARRATOR / LORE / SCENE / IMPORT  (surcharges optionnelles)
```

---

## Règles d'architecture (imposées par conception)

- **SQLite est la source de vérité.** Les agents n'écrivent jamais directement en base — uniquement via des outils qui appellent les repositories.
- **Le moteur de règles est déterministe.** Jets de dés, combat, tests de compétences : TypeScript pur, aucun LLM impliqué.
- **LLM = interprétation et narration uniquement.** Jamais source de vérité.
- **Les agents Mastra ont des outils whitelistés.** Chaque agent n'appelle que les outils définis dans `apps/sidecar/src/mastra/tools/`.

---

## Architecture base de données à deux couches

```
db/statements/<entité>.ts   → requêtes SQL préparées brutes
db/repositories/<entité>.ts → CRUD via statements, retourne des DTOs bruts
repositories/<entité>.repository.ts → encapsule le repo DB, mappe vers les types du domaine
```

Toujours créer les trois fichiers lors de l'introduction d'une nouvelle entité.

---

## Conventions de code

- TypeScript strict mode partout.
- **Pas de point-virgule.** Guillemets simples. Virgules finales. Largeur 100 cars. Indentation 2 espaces.
- Les variables inutilisées doivent être préfixées par `_` (imposé par ESLint).
- Utiliser le pattern `Result<T, E>` (`Ok`/`Err`) de `@open-lore-warden/shared` plutôt que de lever des exceptions entre appels async.
- Toutes les entrées API validées avec des schémas Zod de `@open-lore-warden/domain`.
- Alias de chemins : `@/*` → `src/` local au paquet, `@@/*` → racine du monorepo.

---

## Point d'entrée du sidecar

`apps/sidecar/src/index.ts` — initialise Fastify, exécute les migrations SQLite, enregistre quatre groupes de routes : `/health`, `/campaigns`, `/turns`, `/scenarios`.

Le processus dev utilise `tsx/esm` avec `--watch` :
```bash
node --env-file=../../.env --import tsx/esm --watch src/index.ts
```

---

## Point d'entrée du desktop

`apps/desktop/src/main.ts` → `createApp(App).use(router).mount('#app')`

La plupart des pages (`HomePage`, `TablePage`, `ScenePage`, etc.) sont des stubs. Seule `TestPage` (montée sur `/`) a des fonctionnalités opérationnelles (vérification santé, liste de campagnes, upload PDF).

Le serveur dev Vite est strict sur le port 1420 — Tauri l'attend sur ce port.

---

## Tauri / Rust

- `apps/desktop/src-tauri/lib.rs` — charge `.env`, lance le binaire sidecar (release uniquement), appelle `llama::bootstrap()`.
- `apps/desktop/src-tauri/llama.rs` — détecte le GPU (CUDA / Vulkan / CPU), télécharge `llama-server` depuis les releases GitHub sous forme de ZIP, le lance sur `:8080`, émet des événements `llm-status` vers le frontend. Le démarrage peut prendre jusqu'à **30 minutes** (téléchargement du modèle).
- Le frontend interroge le statut LLM via la commande Tauri `get_llm_status` et écoute les événements `llm-status` (`apps/desktop/src/api/llmApiClient.ts`).

---

## Pas de CI/CD

Pas de `.github/workflows/`, pas de hooks pre-commit, pas de task runner au-delà des scripts `pnpm`.

--- 

## Documentation et bibliothèques

- Pour toute question liée à une bibliothèque, un framework, une API, une configuration, une intégration ou une migration, utiliser Context7.
- Ajouter explicitement `use context7` dans le raisonnement et les requêtes quand une documentation externe fiable est utile.
- S’appuyer en priorité sur Context7 pour Vue, Nuxt, TypeScript, C#, .NET, ASP.NET Core, Vite, Vitest, Playwright, Docker et Azure.
- En cas d’ambiguïté sur une version ou une API, vérifier avec Context7 avant de proposer du code.
- Ne pas inventer d’API ni de paramètres de configuration sans vérification documentaire.