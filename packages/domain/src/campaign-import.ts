/**
 * Types du résultat d'import de scénario PDF.
 * Partagés entre le sidecar (génération) et le desktop (affichage).
 * Préfixés "Import" pour éviter les conflits avec les entités SQLite du domaine.
 */

export interface ImportLocation {
  id: string
  name: string
  description: string
  /**
   * Prompt de génération d'image Stable Diffusion, écrit en anglais par le LLM à l'import.
   * Décrit ce qui est visible dans le lieu et son ambiance, avec la nature du lieu (ville, donjon, forêt…).
   * Optionnel pour rétrocompatibilité avec les imports existants.
   */
  imagePrompt: string
  /** Chemin vers l'image générée pour ce lieu (renseigné après la phase de génération d'images). */
  imagePath?: string
}

/**
 * Nature d'un PNJ — classifiée par le LLM à l'import.
 * Utilisée pour adapter le prompt de génération d'image.
 */
// export type NpcNature =
//   | 'human'     // être humain ordinaire
//   | 'humanoid'  // quasi-humain à comportement social (elfe, nain, tieffelin…)
//   | 'animal'    // animal réel ou fantastique (loup, araignée, aigle…)
//   | 'creature'  // monstre non-humanoïde (dragon, golem, aberration…)
//   | 'undead'    // mort-vivant (zombie, squelette, vampire…)
//   | 'spirit'    // entité immatérielle (spectre, démon, élémental…)
//   | 'construct' // être artificiel (automate, golem de pierre…)

export interface ImportNpcProfile {
  id: string
  name: string
  role: string
  description: string
  /**
   * Nature du personnage, classifiée par le LLM lors de l'import.
   * Optionnel pour rétrocompatibilité avec les imports existants.
   * Absence équivaut à "human" dans le pipeline de génération d'images.
   */
  // nature?: NpcNature
  stats?: Record<string, string | number>
  /**
   * Prompt de génération d'image Stable Diffusion, écrit en anglais par le LLM à l'import.
   * Décrit l'apparence physique du personnage et précise sa race (humain, ours, fantôme, elfe…).
   * Optionnel pour rétrocompatibilité avec les imports existants.
   */
  imagePrompt: string
  /** Chemin vers l'image générée pour ce PNJ (renseigné après la phase de génération d'images). */
  imagePath?: string
}

export interface ImportChapter {
  id: string
  title: string
  summary: string
  content: string
  gmInstructions: string
  sourcePages: number[]
  linkedLocationIds?: string[]
  linkedNpcIds?: string[]
}

export interface ScenarioResult {
  id: string
  title: string
  summary: string
  description: string
  gmInstructions: string
  sourcePages: number[]
  locations: ImportLocation[]
  npcs: ImportNpcProfile[]
  chapters: ImportChapter[]
}

export interface CampaignImportResult {
  importId: string
  title: string
  summary: string
  description: string
  gmInstructions: string
  /**
   * Genre de l'univers — ex : "fantasy médiéval", "science-fiction", "horreur lovecraftienne".
   * Utilisé comme ancrage de style visuel dans les prompts de génération d'images.
   */
  genre: string
  /**
   * Thème narratif dominant — ex : "vengeance et rédemption", "survie désespérée", "mystère et corruption".
   * Utilisé comme ancrage d'ambiance dans les prompts de génération d'images.
   */
  theme: string
  gameSystem: { name: string; edition?: string } | null
  sourceFilename: string
  generatedAt: string
  coverImagePath?: string
  scenarios: ScenarioResult[]
}
