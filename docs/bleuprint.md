# Blueprint

## Vue d’ensemble

Le principe est simple : **l’app desktop affiche et orchestre l’expérience**, **le sidecar exécute toute la logique locale**, **Mastra pilote les agents et workflows**, **SQLite garde la vérité canonique**, et **le LLM local ne fait que raisonner/narrer** sans jamais devenir la source de vérité du jeu. Cette séparation suit de bonnes pratiques de workflow agentique et de packaging sidecar. [mastra](https://mastra.ai/workflows)

```text
┌──────────────────────────────────────────────┐
│ Tauri Desktop App                            │
│ Vue 3 + Pinia + UI Table de jeu              │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│ Node/TypeScript Sidecar                      │
│ Fastify API + App Services                   │
└──────────────────────────────────────────────┘
   │                │                │
   ▼                ▼                ▼
┌───────────┐  ┌──────────────┐  ┌──────────────┐
│ Mastra    │  │ Rules Engine │  │ SQLite       │
│ Agents    │  │ déterministe │  │ état canon   │
│ Workflows │  │              │  │              │
│ Memory    │  │              │  │              │
└───────────┘  └──────────────┘  └──────────────┘
   │
   ▼
┌──────────────────────────────────────────────┐
│ OpenAI-compatible Provider direct            │
│ @ai-sdk/openai-compatible                    │
└──────────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────┐
│ Runtime LLM local                            │
│ LM Studio (dev) / llama.cpp server (cible)   │
└──────────────────────────────────────────────┘
```

## Stack finale

| Domaine           | Choix final                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Shell desktop     | **Tauri v2** [v2.tauri](https://v2.tauri.app/learn/sidecar-nodejs/) |
| UI                | **Vue 3 + TypeScript + Pinia** |
| Backend local     | **Node.js + TypeScript** [v2.tauri](https://v2.tauri.app/learn/sidecar-nodejs/) |
| API locale        | **Fastify** |
| Agents/workflows  | **Mastra** [mastra](https://mastra.ai/docs/agents/overview.md) |
| Mémoire agentique | **Mastra Memory** [mastra](https://mastra.ai/docs/agents/agent-memory/llms.txt) |
| DB canonique      | **SQLite via node:sqlite** |
| Runtime local     | **LM Studio** au dev, **llama.cpp server** en cible [mastra](https://mastra.ai/models/llms.txt) |
| Validation        | **Zod** |
| TTS               | **Piper** ou équivalent |
| Audio ambiance    | assets locaux + service dédié |
| Import scénario   | pipeline TS PDF → JSON |

## Rôle de chaque couche

### Tauri + Vue

La couche desktop gère l’UI, le cycle de vie de l’application, le lancement du sidecar, et l’expérience utilisateur générale. Tauri documente explicitement le fait qu’un sidecar Node peut être empaqueté comme binaire autonome, sans nécessiter Node installé chez l’utilisateur. [v2.tauri](https://v2.tauri.app/learn/sidecar-nodejs/)

### Sidecar TS

Le sidecar est ton **backend local privé**. Il contient :

- l’API locale,
- la logique métier,
- l’orchestration des workflows Mastra,
- les appels SQLite,
- les services médias,

### Mastra

Mastra sert de **cadre agentique**. Ses docs montrent qu’il gère :

- des **agents** avec modèle, outils et instructions, [mastra](https://mastra.ai/docs/agents/overview.md)
- de la **mémoire** via `Memory`, [mastra](https://mastra.ai/docs/agents/agent-memory/llms.txt)
- et des **workflows** multi-étapes. [mastra](https://mastra.ai/workflows)

## Arborescence monorepo

```text
open-lore-warden/
├─ apps/
│  ├─ desktop/
│  │  ├─ src/
│  │  │  ├─ components/
│  │  │  ├─ views/
│  │  │  ├─ stores/
│  │  │  ├─ services/
│  │  │  ├─ composables/
│  │  │  ├─ router/
│  │  │  └─ types/
│  │  ├─ src-tauri/
│  │  │  ├─ src/
│  │  │  ├─ capabilities/
│  │  │  ├─ icons/
│  │  │  ├─ binaries/
│  │  │  └─ tauri.conf.json
│  │  └─ package.json
│  │
│  └─ sidecar/
│     ├─ src/
│     │  ├─ api/
│     │  ├─ config/
│     │  ├─ core/
│     │  ├─ mastra/
│     │  ├─ rules/
│     │  ├─ db/
│     │  │  ├─ database.ts
│     │  │  ├─ migrations.ts
│     │  │  ├─ statements/
│     │  │  ├─ repositories/
│     │  │  └─ transactions.ts  
│     │  ├─ services/
│     │  ├─ media/
│     │  ├─ importer/
│     │  ├─ llm/
│     │  ├─ jobs/
│     │  └─ main.ts
│     └─ package.json
│
├─ packages/
│  ├─ shared/
│  ├─ domain/
│  ├─ db-schema/
│  ├─ rules-engine/
│  ├─ mastra-agents/
│  ├─ mastra-workflows/
│  ├─ llm-provider/
│  ├─ media-core/
│  └─ scenario-importer/
│
├─ assets/
│  ├─ audio/
│  ├─ prompts/
│  ├─ voices/
│  └─ images/
│
├─ data/
│  ├─ campaigns/
│  ├─ imports/
│  ├─ cache/
│  └─ logs/
│
└─ docs/
```

## Frontend desktop

Le frontend doit être organisé autour du **tour de jeu**, pas autour des composants IA.

### Vues principales

- **HomeView** : campagnes, création, chargement.
- **TableView** : écran principal de jeu.
- **SceneView** : scène active, ambiance, progression.
- **CharactersView** : PJ, PNJ, stats, relations.
- **JournalView** : historique et résumés.
- **ImportView** : import de scénarios PDF/JSON.
- **SettingsView** : modèle local, voix, audio, diagnostics.

### Stores Pinia

- `useCampaignStore`
- `useSceneStore`
- `useTurnStore`
- `useCharacterStore`
- `useAudioStore`
- `useSystemStore`

### Services frontend

- `sidecarApiClient.ts`
- `audioPlaybackService.ts`
- `tauriSidecarService.ts`
- `healthcheckService.ts`

## Sidecar TypeScript

Le sidecar démarre au boot de l’application et expose une API locale. Tauri documente que le sidecar Node doit être compilé en binaire autonome puis déclaré dans `bundle.externalBin`. [v2.tauri](https://v2.tauri.app/fr/learn/sidecar-nodejs/)

### Structure interne

```text
apps/sidecar/src/
├─ main.ts
├─ server.ts
├─ config/
│  ├─ app-config.ts
│  ├─ model-config.ts
│  └─ paths.ts
├─ core/
│  ├─ app-context.ts
│  ├─ logger.ts
│  ├─ event-bus.ts
│  ├─ errors.ts
│  └─ result.ts
├─ api/
│  ├─ routes/
│  ├─ controllers/
│  ├─ schemas/
│  └─ middleware/
├─ mastra/
│  ├─ agents/
│  ├─ workflows/
│  ├─ memory/
│  ├─ tools/
│  └─ registry.ts
├─ rules/
├─ db/
│  ├─ database.ts
│  ├─ migrations.ts
│  ├─ statements/
│  ├─ repositories/
│  └─ transactions.ts
├─ services/
├─ media/
├─ importer/
├─ llm/
└─ jobs/
```

## Mastra : agents

Mastra permet de définir des agents TypeScript avec modèle, instructions, outils et mémoire. Les docs montrent aussi l’usage de `generate()` avec options de mémoire de thread/resource, ce qui colle bien à une campagne ou une session persistante. [mastra](https://mastra.ai/docs/agents/overview.md)

### Agents recommandés

- **IntentInterpreterAgent**
- **NarratorAgent**
- **LoreKeeperAgent**
- **SceneDirectorAgent**

### Rôle de chacun

- `IntentInterpreterAgent` : reformule proprement l’action joueur en intention exploitable.
- `NarratorAgent` : produit la narration finale, concise et cohérente.
- `LoreKeeperAgent` : extrait/récupère les faits de contexte utiles et résume les tours.
- `SceneDirectorAgent` : décide des signaux d’ambiance, voix, musique, intensité.

### Exemple de logique d’agent

Chaque agent a :

- des **instructions très strictes**,
- un **modèle dédié**,
- des **tools whitelistés**,
- une **mémoire limitée**.

Le Narrator, par exemple, ne doit jamais modifier l’état du monde; il ne fait que verbaliser le résultat validé par le moteur déterministe.

## Mastra : workflows

Mastra propose des workflows multi-étapes pour composer des processus agentiques. C’est exactement ce qu’il faut pour piloter un tour de jeu sans laisser les agents improviser toute l’architecture. [mastra](https://mastra.ai/workflows)

### Workflows recommandés

- `resolveTurnWorkflow`
- `importScenarioWorkflow`
- `generateSceneAssetsWorkflow`
- `sessionSummaryWorkflow`
- `bootstrapCampaignWorkflow`

### Workflow principal : `resolveTurnWorkflow`

1. Charger campagne, scène, contexte.
2. Charger mémoire pertinente.
3. Interpréter l’action du joueur.
4. Appeler le moteur de règles.
5. Produire la narration.
6. Déterminer le plan média.
7. Persister les changements.
8. Mettre à jour la mémoire.

## Mastra : tools

Les tools sont le point clé pour garder le contrôle. Mastra encourage précisément l’usage d’outils explicites plutôt que de laisser l’agent “faire croire” qu’il agit. [mastra](https://mastra.ai/docs/agents/overview.md)

### Tools à prévoir

- `loadCampaignContextTool`
- `loadSceneTool`
- `getNpcProfileTool`
- `getQuestStateTool`
- `rollDiceTool`
- `applyDamageTool`
- `updateFlagTool`
- `moveActorTool`
- `storeMemoryTool`
- `planAudioCueTool`
- `queueTtsTool`
- `queueImageJobTool`

### Règle d’or

Un agent Mastra **ne modifie pas directement SQLite**. Il passe toujours par un tool métier.

## Source de vérité

La séparation doit être absolue :

- **SQLite = état réel**
- **Rules engine = arbitrage réel**
- **Mastra = orchestration + raisonnement**
- **LLM = interprétation / narration**
- **mémoire agentique = aide contextuelle**

C’est ce qui évitera les incohérences sur les longues campagnes.

## Schéma SQLite

Je te conseille de garder le schéma dans un package dédié partagé par le sidecar.

### Tables principales

- `campaigns`
- `players`
- `characters`
- `npcs`
- `factions`
- `locations`
- `scenes`
- `scene_connections`
- `quests`
- `encounters`
- `items`
- `inventory_items`
- `campaign_flags`
- `turns`
- `turn_events`
- `memories`
- `voice_profiles`
- `audio_cues`
- `image_assets`
- `scenario_imports`

### Tables cœur détaillées

#### `campaigns`

- `id`
- `name`
- `system`
- `setting`
- `current_scene_id`
- `created_at`
- `updated_at`

#### `characters`

- `id`
- `campaign_id`
- `name`
- `role`
- `level`
- `hp_current`
- `hp_max`
- `armor_class`
- `initiative_bonus`
- `stats_json`
- `status_json`

#### `npcs`

- `id`
- `campaign_id`
- `name`
- `faction_id`
- `location_id`
- `voice_profile_id`
- `summary`
- `disposition`
- `secret_notes`

#### `scenes`

- `id`
- `campaign_id`
- `location_id`
- `name`
- `scene_type`
- `status`
- `intensity`
- `entry_conditions_json`
- `exit_conditions_json`
- `audio_cue_id`

#### `turns`

- `id`
- `campaign_id`
- `scene_id`
- `player_input`
- `intent_json`
- `rules_result_json`
- `narration_text`
- `media_plan_json`
- `created_at`

#### `memories`

- `id`
- `campaign_id`
- `entity_type`
- `entity_id`
- `memory_type`
- `content`
- `importance`
- `source_turn_id`
- `created_at`

### Indexes

- `turns(campaign_id, created_at DESC)`
- `scenes(campaign_id, status)`
- `npcs(campaign_id, location_id)`
- `memories(campaign_id, entity_type, entity_id)`
- `campaign_flags(campaign_id, key)`

## Repositories

Un repository par agrégat :

- `CampaignRepository`
- `SceneRepository`
- `CharacterRepository`
- `NpcRepository`
- `TurnRepository`
- `MemoryRepository`
- `QuestRepository`

Ils contiennent :

- les requêtes SQL,
- les transactions,
- les mappings vers les types métier.

## Rules engine

Le moteur de règles doit être une librairie TS pure, découplée de Mastra et du frontend.

### Modules

- `dice`
- `checks`
- `combat`
- `inventory`
- `statuses`
- `quest-state`
- `scene-progress`

### Principe

Le moteur :

- reçoit une intention structurée,
- exécute les règles,
- renvoie un résultat de domaine,
- et ne génère jamais de texte littéraire.

### Couche LLM

La couche packages/llm-provider/ pourrait ressembler à ça :

```text
packages/llm-provider/
├─ src/
│  ├─ provider.ts
│  ├─ models.ts
│  ├─ health.ts
│  ├─ capabilities.ts
│  └─ index.ts
```

Responsabilités

- créer le provider OpenAI-compatible,
- déclarer les modèles logiques,
- faire le healthcheck du runtime local,
- récupérer /v1/models pour détecter les modèles disponibles.
  C’est utile parce que la doc LM Studio recommande justement de s’appuyer sur les endpoints compatibles OpenAI existants, et fournit aussi /v1/models pour découvrir les modèles.

### Stratégie recommandée

- **Dev** : LM Studio local.
- **Produit** : llama.cpp server ou équivalent.
- **Mastra** pointe vers llama.cpp/LM Studio grace au provider OpenAI-compatible direct.
- **Provider OpenAI-compatible direct** pointe vers le runtime réel.

### Alias de modèles

- `gm-intent`
- `gm-narrator`
- `gm-lore`
- `gm-scene`
- `gm-import`

Comme ça, tu peux changer de backend sans toucher les workflows.

## Mémoire Mastra

Mastra permet de brancher de la mémoire aux agents avec un objet `Memory`, et de l’utiliser par thread/resource. [mastra](https://mastra.ai/docs/agents/agent-memory/llms.txt)

### Utilisation recommandée

- `thread` = campagne ou session.
- `resource` = joueur, scène ou PNJ selon le cas.
- mémoire courte limitée aux derniers messages.
- mémoire longue synthétisée et stockée à part.

### Important

Je te déconseille d’utiliser la mémoire Mastra comme seule mémoire du produit. Elle doit compléter :

- SQLite,
- et tes résumés métier stockés en base.

## Services médias

### TTS

- `VoiceCatalogService`
- `TtsService`
- `SpeechCacheService`

### Audio

- `AmbienceService`
- `MusicService`
- `SfxService`
- `SceneAudioPlanner`

### Images

- `PortraitJobService`
- `LocationImageJobService`
- `MapAssetService`

Les images doivent être traitées en **asynchrone**, pas dans le chemin critique du tour.

## Import PDF → JSON

Le pipeline d’import peut aussi utiliser Mastra avec un workflow dédié.

### Étapes

1. extraction texte du PDF,
2. nettoyage,
3. segmentation en chapitres/scènes,
4. extraction structurée via agent `gm-import`,
5. validation Zod,
6. normalisation,
7. insertion SQLite,
8. validation utilisateur.

### Sorties

- JSON intermédiaire éditable,
- aperçu dans l’UI,
- import final seulement après confirmation.

## API locale du sidecar

Je te recommande Fastify avec Zod.

### Routes principales

- `GET /system/health`
- `POST /campaigns`
- `GET /campaigns`
- `POST /campaigns/:id/load`
- `GET /scenes/current`
- `POST /turns/resolve`
- `GET /turns/latest`
- `GET /characters`
- `PATCH /characters/:id`
- `POST /tts/speak`
- `POST /audio/scene`
- `POST /import/pdf`
- `GET /import/:jobId`

### Exemple de réponse `POST /turns/resolve`

```json
{
  "turnId": "turn_145",
  "narration": "La pierre se fend sous l'effort et un souffle glacé s'échappe du couloir.",
  "rulesResult": {
    "check": "strength",
    "roll": 18,
    "success": true
  },
  "stateChanges": {
    "sceneStatus": "opened",
    "flags": ["crypt_entrance_opened"]
  },
  "mediaPlan": {
    "ttsVoice": "gm_main",
    "ambience": "crypt_cold",
    "music": "mystery_low",
    "sfx": ["stone_gate_open"]
  }
}
```

## Flux complet d’un tour

```text
1. Le joueur envoie une action depuis l’UI
2. Le sidecar charge campagne + scène + acteurs
3. Le workflow Mastra récupère la mémoire pertinente
4. IntentInterpreterAgent structure l’intention
5. Rules Engine résout l’action
6. NarratorAgent verbalise le résultat
7. SceneDirectorAgent prépare ambiance/TTS/SFX
8. Le sidecar persiste tout en SQLite
9. LoreKeeperAgent extrait les faits à mémoriser
10. L’UI reçoit narration + état + médias
```

Ce découpage garde la logique métier dans le code, et l’intelligence générative dans des zones bien bornées.

## Intégration Tauri

Tauri recommande de configurer le sidecar via `bundle.externalBin` et de le lancer depuis l’app une fois le binaire préparé pour la plateforme cible. [v2.tauri](https://v2.tauri.app/fr/learn/sidecar-nodejs/)

### Pattern recommandé

- build du sidecar Node en binaire autonome,
- copie vers `src-tauri/binaries/`,
- déclaration dans `externalBin`,
- lancement au boot,
- healthcheck,
- restart contrôlé si crash,
- arrêt propre à la fermeture.

## Installation utilisateur

Tu voulais minimiser les prérequis. Le flow recommandé est :

1. installation de l’app,
2. premier démarrage,
3. création des dossiers app data,
4. init SQLite,
5. lancement sidecar,
6. détection du runtime local,
7. téléchargement guidé du modèle si nécessaire,
8. test TTS,
9. arrivée sur l’assistant de première campagne.

## Ce qu’il faut absolument éviter

- laisser les agents écrire directement dans la base,
- mettre toute la mémoire dans le prompt,
- faire du LLM la source de vérité,
- mettre génération d’image et résolution de tour dans le même chemin critique,
- multiplier les agents “pour faire plus agentique”.

## Recommandation finale

Le blueprint final recommandé est donc : **Tauri + Vue pour l’app, Node/TypeScript sidecar pour le backend, Mastra pour agents/workflows/mémoire, SQLite comme état canonique, rules engine TS pur, et runtime local OpenAI-compatible derrière**. Cette stack est techniquement cohérente, alignée avec tes compétences, et beaucoup plus réaliste à mener à terme qu’une architecture hybride TypeScript + Python. [v2.tauri](https://v2.tauri.app/learn/sidecar-nodejs/)

Si tu veux, l’étape suivante la plus utile est que je te produise soit :

- **l’arborescence exacte fichier par fichier**,
- soit **le schéma SQLite complet en SQL**,
- soit **un squelette de code initial Mastra + sidecar + Fastify**.
