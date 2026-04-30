/**
 * Client LLM — configuration et utilitaires pour le runtime local compatible
 * OpenAI (LM Studio en dev, llama.cpp server en prod).
 *
 * Variables d'environnement :
 *   LLM_HOST              Hôte du serveur d'inférence             (défaut : 127.0.0.1)
 *   LLM_PORT              Port du serveur d'inférence             (défaut : 8080)
 *   LLM_BASE_URL          URL de base complète — quand défini, LLM_HOST/LLM_PORT sont ignorés
 *                         (défaut : http://<LLM_HOST>:<LLM_PORT>/v1)
 *   LLM_MODEL_INTENT      Id de modèle pour l'IntentInterpreterAgent
 *   LLM_MODEL_NARRATOR    Id de modèle pour le NarratorAgent
 *   LLM_MODEL_LORE        Id de modèle pour le LoreKeeperAgent
 *   LLM_MODEL_SCENE       Id de modèle pour le SceneDirectorAgent
 *   LLM_MODEL_IMPORT      Id de modèle pour le pipeline d'import de scénario
 */

/** Alias logiques de modèles utilisés dans toute l'application. */
export type ModelAlias = 'gm-intent' | 'gm-narrator' | 'gm-lore' | 'gm-scene' | 'gm-import'

/** Shape de config consommée par la propriété `model` de Mastra. */
export interface ModelConfig {
  id: `${string}/${string}`
  url: string
}

const LLM_HOST = process.env.LLM_HOST ?? '127.0.0.1'
const LLM_PORT = process.env.LLM_PORT ?? '8080'
const BASE_URL = process.env.LLM_BASE_URL ?? `http://${LLM_HOST}:${LLM_PORT}/v1`

const DEFAULT_MODEL: `${string}/${string}` = 'lmstudio/local-model'

const MODEL_IDS: Record<ModelAlias, `${string}/${string}`> = {
  'gm-intent': (process.env.LLM_MODEL_INTENT ?? DEFAULT_MODEL) as `${string}/${string}`,
  'gm-narrator': (process.env.LLM_MODEL_NARRATOR ?? DEFAULT_MODEL) as `${string}/${string}`,
  'gm-lore': (process.env.LLM_MODEL_LORE ?? DEFAULT_MODEL) as `${string}/${string}`,
  'gm-scene': (process.env.LLM_MODEL_SCENE ?? DEFAULT_MODEL) as `${string}/${string}`,
  'gm-import': (process.env.LLM_MODEL_IMPORT ?? DEFAULT_MODEL) as `${string}/${string}`,
}

/** Retourne la config de modèle compatible Mastra pour un alias donné. */
export function getModelConfig(alias: ModelAlias): ModelConfig {
  return { id: MODEL_IDS[alias], url: BASE_URL }
}

/**
 * Vérifie si le runtime LLM local est joignable en appelant /v1/models.
 * Retourne true si l'endpoint répond en 2xx.
 */
export async function checkLlmHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/models`, {
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Récupère la liste des modèles disponibles sur le runtime local.
 * Retourne un tableau vide si l'endpoint est inaccessible.
 */
export async function listAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/models`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return []
    const data = (await response.json()) as { data?: Array<{ id: string }> }
    return (data.data ?? []).map((m) => m.id)
  } catch {
    return []
  }
}
