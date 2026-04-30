# Plan : Réorganisation du stockage des imports de scénario

## Objectif

Chaque import PDF dispose d'un dossier unique `{importId}/` (UUID = jobId).  
Le résultat final (`campaign.json`) est à la racine du dossier.  
Toutes les images (couverture + images générées) sont dans `images/`.  
Les fichiers intermédiaires de debug sont dans `debug/`.

## Structure cible

```
{DATA_DIR}/scenario-imports/
  {importId}/
    campaign.json           ← résultat final
    images/
      cover.png             ← image de couverture extraite du PDF
      npc-{id}.png          ← portraits NPC générés par SD
      location-{id}.png     ← lieux générés par SD
    debug/
      uploads/              ← PDF original conservé
      raw/                  ← JSON texte brut extrait
      classified/           ← JSON pages classifiées + structure
      generated/            ← JSON génération intermédiaire
```

## Fichiers à modifier

### 1. `apps/sidecar/src/api/scenario-import.route.ts`

- Supprimer l'import `basename` (plus utilisé)
- Supprimer l'import `randomUUID` (plus utilisé ici)
- Changer l'ordre : **créer le job en premier** (`createJob`) pour obtenir `job.id`
- Écrire le PDF dans `{DATA_DIR}/scenario-imports/{job.id}/debug/uploads/{stem}.pdf`

```ts
// Avant
const uploadDir = join(config.DATA_DIR, 'scenario-imports', 'uploads')
mkdirSync(uploadDir, { recursive: true })
const tempPath = join(uploadDir, `${randomUUID()}.pdf`)
writeFileSync(tempPath, fileBuffer)
const sourceName = filename ?? basename(tempPath)
const stem = ...
const job = createJob(filename, gameSystemId)

// Après
const sourceName = filename ?? 'upload.pdf'
const stem = ...
const job = createJob(filename, gameSystemId)
const uploadDir = join(config.DATA_DIR, 'scenario-imports', job.id, 'debug', 'uploads')
mkdirSync(uploadDir, { recursive: true })
const tempPath = join(uploadDir, `${stem}.pdf`)
writeFileSync(tempPath, fileBuffer)
```

### 2. `apps/sidecar/src/services/pdf-extractor.service.ts`

Ajouter le paramètre `importDir: string` à `extractPdfSections`.

- **Couverture** → `join(importDir, 'images', 'cover.png')` (dans le dossier images)
- **Raw JSON** → `join(importDir, 'debug', 'raw', ...)`
- Supprimer le paramètre `context` (le chemin est maintenant explicite via `importDir`)

```ts
// Avant
export async function extractPdfSections(
  filePath: string,
  stem: string,
  originalFilename?: string,
  context: 'ruleset' | 'scenario' = 'ruleset',
): Promise<...>

// Après
export async function extractPdfSections(
  filePath: string,
  stem: string,
  originalFilename?: string,
  importDir?: string,
): Promise<...>
```

Dans le corps :
```ts
// Couverture
const imgDir = join(importDir, 'images')
mkdirSync(imgDir, { recursive: true })
coverImagePath = join(imgDir, 'cover.png')  // nom fixe, pas de timestamp

// Raw
const rawDir = join(importDir, 'debug', 'raw')
mkdirSync(rawDir, { recursive: true })
const outputPath = join(rawDir, `${stem}.json`)  // nom fixe, pas de timestamp
```

Si `importDir` est absent (appel sans contexte d'import), ne pas écrire les artefacts.

### 3. `apps/sidecar/src/services/scenario-classifier.service.ts`

Modifier `persistStructureArtifacts` pour accepter `importDir` :

```ts
// Avant
export function persistStructureArtifacts(
  stem: string,
  rawPages: PageSection[],
  classified: ClassifiedPage[],
  structure: CampaignStructure,
): void {
  const dir = join(config.DATA_DIR, 'scenario-imports', 'classified')
  ...
}

// Après
export function persistStructureArtifacts(
  stem: string,
  rawPages: PageSection[],
  classified: ClassifiedPage[],
  structure: CampaignStructure,
  importDir: string,
): void {
  const dir = join(importDir, 'debug', 'classified')
  ...
}
```

Noms de fichiers simplifiés (sans timestamp) : `pages.json` et `structure.json`.

### 4. `apps/sidecar/src/services/scenario-enricher.service.ts`

- Ajouter `importId: string` dans le type `CampaignImportResult`
- Modifier `persistGenerationArtifacts` pour accepter `importDir` :

```ts
export type CampaignImportResult = {
  importId: string  // ← nouveau champ
  title: string
  summary: string
  description: string
  gmInstructions: string
  genre: string
  theme: string
  gameSystem: { name: string; edition?: string } | null
  sourceFilename: string
  generatedAt: string
  coverImagePath?: string
  scenarios: Scenario[]
}

export function persistGenerationArtifacts(
  stem: string,
  result: CampaignImportResult,
  importDir: string,
): void {
  const dir = join(importDir, 'debug', 'generated')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'campaign.json'),  // nom fixe, pas de timestamp
    JSON.stringify(result, null, 2),
    'utf-8',
  )
}
```

### 5. `apps/sidecar/src/services/scenario-import-job.service.ts`

Principal orchestrateur — calcule `importDir` et le propage à tous les services :

```ts
const importDir = join(config.DATA_DIR, 'scenario-imports', jobId)

// Phase 0 — extraction PDF
const extracted = await extractPdfSections(tempPath, stem, filename, importDir)
// NE PAS supprimer tempPath — le PDF est conservé dans debug/uploads/

// Phase 2 — persistance classification
persistStructureArtifacts(stem, sections, classified, campaignStructure, importDir)

// Phase 4 — persistance génération intermédiaire
persistGenerationArtifacts(stem, result, importDir)

// Phase 5 — résultat final à la racine
const result: CampaignImportResult = {
  importId: jobId,  // ← nouveau
  ...campaignHeader,
  sourceFilename: filename,
  generatedAt: new Date().toISOString(),
  coverImagePath,
  scenarios,
}
const resultPath = join(importDir, 'campaign.json')
mkdirSync(importDir, { recursive: true })
writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8')
```

Les deux blocs `try { unlinkSync(tempPath) } catch {}` sont **supprimés** (le PDF est conservé).

### 6. `apps/sidecar/src/services/image-generation.service.ts`

Recalcule `importDir` depuis `importJobId` (pas de changement de signature publique) :

```ts
// Avant
const imagesDir = join(config.DATA_DIR, 'scenario-imports', 'results', 'images', importJobId)

// Après
const importDir = join(config.DATA_DIR, 'scenario-imports', importJobId)
const imagesDir = join(importDir, 'images')
```

## Pas de changement dans `packages/domain`

Le type `ImportJob` n'a pas besoin de changer — `resultPath` pointera vers `{importId}/campaign.json`.  
Le champ `importId` est ajouté directement dans `CampaignImportResult` (type local au sidecar).

## Résumé des signatures modifiées

| Fonction | Avant | Après |
|---|---|---|
| `extractPdfSections` | `(filePath, stem, originalFilename?, context?)` | `(filePath, stem, originalFilename?, importDir?)` |
| `persistStructureArtifacts` | `(stem, rawPages, classified, structure)` | `(stem, rawPages, classified, structure, importDir)` |
| `persistGenerationArtifacts` | `(stem, result)` | `(stem, result, importDir)` |
| `runImportPipeline` | inchangée | inchangée (calcule `importDir` en interne) |
| `runImageGenerationPipeline` | inchangée | inchangée (recalcule `importDir` en interne) |
