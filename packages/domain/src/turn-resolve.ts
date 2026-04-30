/** Résultat de POST /turns/resolve — sortie du pipeline de résolution de tour. */
export interface ResolveTurnResult {
  turnId: string
  /** Texte de narration généré par le MJ IA. */
  narration: string
  /** Résultat brut du moteur de règles (structure variable selon le système de jeu). */
  rulesResult: Record<string, unknown>
  /** Changements d'état extraits du résultat des règles. */
  stateChanges: Record<string, unknown>
  /** Plan audio/visuel associé au tour. */
  mediaPlan: Record<string, unknown>
}
