// ---------------------------------------------------------------------------
// Types des descripteurs de systèmes de jeu
// ---------------------------------------------------------------------------

/** Taille de dé utilisable dans un système. 'F' = dé Fate (d3 mappé -1/0/+1). */
export type DieSize = 4 | 6 | 8 | 10 | 12 | 20 | 100 | 'F'

/**
 * Mécanique de résolution principale du système.
 * Clé i18n côté frontend : systems.resolution.${value}
 */
export type ResolutionMechanic =
  | 'roll-over'   // D&D 5e, generic — lancer un dé et dépasser un seuil
  | 'roll-under'  // CoC 7e, BRP — lancer sous la valeur de compétence (d100)
  | 'dice-pool'   // Year Zero Engine — pool de d6, compter les 6 comme succès
  | 'fate-dice'   // Fate Core — 4dF + niveau de compétence (échelle d'adjectifs)
  | '2d6-stat'    // PbtA — 2d6 + stat : 10+ succès, 7-9 partiel, 6- échec
  | 'trait-wild'  // Savage Worlds — dé de trait + dé sauvage d6, battre TN 4

/**
 * Système de gestion de la santé / blessures.
 * Clé i18n côté frontend : systems.health.${value}
 */
export type HealthSystem =
  | 'hit-points'           // Points de vie numériques (D&D 5e, generic)
  | 'hit-points-sanity'    // PV + jauge de santé mentale (CoC 7e, BRP)
  | 'stress-consequences'  // Pistes de stress + conséquences narratives (Fate Core)
  | 'harm'                 // Piste de blessures numérique (PbtA)
  | 'stress-trauma'        // Stress + trauma (Year Zero Engine)
  | 'wounds-shaken'        // Blessures + état Ébranlé (Savage Worlds)

/**
 * Fonctionnalité mécanique spéciale du système.
 * Clé i18n côté frontend : systems.feature.${value}
 */
export type SpecialFeature =
  | 'advantage-disadvantage' // D&D 5e — avantage / désavantage sur les jets
  | 'death-saves'            // D&D 5e — jets de sauvegarde contre la mort
  | 'sanity'                 // CoC 7e, BRP — jauge de santé mentale
  | 'success-levels'         // CoC 7e — niveaux de succès (extreme/hard/regular/fumble)
  | 'brp-success-levels'     // BRP — niveaux de succès (critical/special/success/fumble)
  | 'aspects-invoke-compel'  // Fate Core — aspects, invocations et complications
  | 'fate-ladder'            // Fate Core — échelle d'adjectifs (-2 Terrible → +8 Légendaire)
  | 'moves'                  // PbtA — moves (actions déclencheurs) à la place de compétences
  | 'push-roll'              // Year Zero Engine — relance les dés en acceptant du stress
  | 'wild-card'              // Savage Worlds — personnages Wild Card avec dé sauvage d6
  | 'bennies'                // Savage Worlds — jetons de chance réutilisables
  | 'raises'                 // Savage Worlds — paliers de 4 points au-dessus du TN

/** Complexité estimée du système pour l'UI d'aide au choix. */
export type SystemComplexity = 'low' | 'medium' | 'high'

/**
 * Descripteur complet d'un système de jeu.
 *
 * Tous les champs textuels sont des identifiants stables destinés à l'i18n
 * côté frontend. Seul `llmName` est un texte lisible — il est réservé à un
 * usage interne (prompts LLM) et ne doit jamais être exposé par l'API.
 */
export type GameSystemDescriptor = {
  /** Identifiant stable, utilisé comme clé de traduction et dans les API. */
  id: string
  /**
   * Nom lisible injecté dans les prompts LLM.
   * @internal Ne pas exposer via l'API.
   */
  llmName: string
  /** Dés utilisés dans ce système. */
  dice: DieSize[]
  /** Mécanique de résolution principale. */
  resolution: ResolutionMechanic
  /** Vrai si le personnage progresse par niveaux. */
  hasLevels: boolean
  /** Niveau maximum (défini uniquement si hasLevels = true). */
  maxLevel?: number
  /** Système de gestion de la santé / blessures. */
  healthSystem: HealthSystem
  /** Fonctionnalités mécaniques spéciales. */
  specialFeatures: SpecialFeature[]
  /**
   * Identifiants des attributs principaux.
   * Clé i18n : systems.${id}.attributes.${attrId}
   * Tableau vide si les attributs sont libres ou définis par le jeu spécifique.
   */
  coreAttributeIds: string[]
  /**
   * Tags de genre.
   * Clé i18n : systems.genre.${tag}
   */
  genre: string[]
  /** Complexité estimée pour l'aide au choix dans l'UI. */
  complexity: SystemComplexity
}

// ---------------------------------------------------------------------------
// Registre des systèmes supportés
// Doit rester synchronisé avec les modules du rules-engine :
//   core/ → generic | dnd5e/ → dnd-5e | coc/ → coc-7e | fate/ → fate-core
//   pbta/ → pbta   | yze/  → yze     | brp/ → brp     | savage/ → savage-worlds
// ---------------------------------------------------------------------------

export const GAME_SYSTEMS: readonly GameSystemDescriptor[] = [
  {
    id: 'generic',
    llmName: 'Generic RPG System (system-agnostic)',
    dice: [4, 6, 8, 10, 12, 20],
    resolution: 'roll-over',
    hasLevels: false,
    healthSystem: 'hit-points',
    specialFeatures: [],
    coreAttributeIds: [],
    genre: ['universal'],
    complexity: 'low',
  },
  {
    id: 'dnd-5e',
    llmName: 'Dungeons & Dragons 5th Edition',
    dice: [4, 6, 8, 10, 12, 20],
    resolution: 'roll-over',
    hasLevels: true,
    maxLevel: 20,
    healthSystem: 'hit-points',
    specialFeatures: ['advantage-disadvantage', 'death-saves'],
    coreAttributeIds: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
    genre: ['fantasy'],
    complexity: 'medium',
  },
  {
    id: 'coc-7e',
    llmName: 'Call of Cthulhu 7th Edition',
    dice: [6, 8, 10, 100],
    resolution: 'roll-under',
    hasLevels: false,
    healthSystem: 'hit-points-sanity',
    specialFeatures: ['sanity', 'success-levels'],
    coreAttributeIds: ['str', 'con', 'siz', 'dex', 'int', 'pow', 'app', 'edu'],
    genre: ['horror'],
    complexity: 'medium',
  },
  {
    id: 'fate-core',
    llmName: 'Fate Core',
    dice: ['F'],
    resolution: 'fate-dice',
    hasLevels: false,
    healthSystem: 'stress-consequences',
    specialFeatures: ['aspects-invoke-compel', 'fate-ladder'],
    coreAttributeIds: [],
    genre: ['universal'],
    complexity: 'medium',
  },
  {
    id: 'pbta',
    llmName: 'Powered by the Apocalypse',
    dice: [6],
    resolution: '2d6-stat',
    hasLevels: false,
    healthSystem: 'harm',
    specialFeatures: ['moves'],
    coreAttributeIds: [],
    genre: ['universal', 'post-apoc'],
    complexity: 'low',
  },
  {
    id: 'yze',
    llmName: 'Year Zero Engine (Forbidden Lands / Alien RPG)',
    dice: [6],
    resolution: 'dice-pool',
    hasLevels: false,
    healthSystem: 'stress-trauma',
    specialFeatures: ['push-roll'],
    coreAttributeIds: ['strength', 'agility', 'wits', 'empathy'],
    genre: ['universal', 'sci-fi', 'fantasy'],
    complexity: 'low',
  },
  {
    id: 'brp',
    llmName: 'Basic Role-Playing (BRP / Chaosium)',
    dice: [6, 8, 10, 100],
    resolution: 'roll-under',
    hasLevels: false,
    healthSystem: 'hit-points-sanity',
    specialFeatures: ['sanity', 'brp-success-levels'],
    coreAttributeIds: ['str', 'con', 'siz', 'dex', 'int', 'pow', 'app'],
    genre: ['universal', 'horror'],
    complexity: 'medium',
  },
  {
    id: 'savage-worlds',
    llmName: 'Savage Worlds Adventure Edition',
    dice: [4, 6, 8, 10, 12],
    resolution: 'trait-wild',
    hasLevels: false,
    healthSystem: 'wounds-shaken',
    specialFeatures: ['wild-card', 'bennies', 'raises'],
    coreAttributeIds: ['agility', 'smarts', 'spirit', 'strength', 'vigor'],
    genre: ['universal'],
    complexity: 'medium',
  },
] as const

/** Union des IDs de systèmes supportés. */
export type GameSystemId = (typeof GAME_SYSTEMS)[number]['id']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Retourne le descripteur complet d'un système par son ID.
 * Retourne `undefined` si l'ID est inconnu.
 */
export function getSystemDescriptor(id: string): GameSystemDescriptor | undefined {
  return GAME_SYSTEMS.find((s) => s.id === id)
}

/**
 * Retourne le `llmName` d'un système à partir de son ID.
 * Retourne le llmName de `generic` si l'ID est null ou inconnu.
 *
 * @internal Réservé à l'injection dans les prompts LLM — ne pas exposer par API.
 */
export function resolveGameSystemName(id: string | null): string {
  const found = id ? getSystemDescriptor(id) : undefined
  return found?.llmName ?? (GAME_SYSTEMS[0].llmName as string)
}

/**
 * Descripteur d'un système de jeu tel qu'exposé par l'API publique.
 * Identique à `GameSystemDescriptor` sans le champ `llmName` (usage interne LLM uniquement).
 */
export type PublicGameSystemDescriptor = Omit<GameSystemDescriptor, 'llmName'>

/**
 * Retourne la liste des descripteurs sans le champ `llmName`, pour l'API publique.
 */
export function listPublicSystemDescriptors(): PublicGameSystemDescriptor[] {
  return GAME_SYSTEMS.map(({ llmName: _llmName, ...rest }) => rest)
}
