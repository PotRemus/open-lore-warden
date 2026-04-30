/**
 * Client Stable Diffusion — configuration et utilitaires pour le serveur local
 * stable-diffusion.cpp (sd-server).
 *
 * Variables d'environnement :
 *   SD_HOST    Hôte du serveur sd-server    (défaut : 127.0.0.1)
 *   SD_PORT    Port du serveur sd-server    (défaut : 8081)
 *
 * Le serveur est démarré à la demande par Tauri (stable_diffusion.rs) via la
 * commande `start_sd_server`. Le sidecar communique avec lui via HTTP.
 *
 * On utilise l'endpoint synchrone `/sdapi/v1/txt2img` (compatible WebUI /
 * AUTOMATIC1111) plutôt que l'API async native `/sdcpp/v1/img_gen`.
 * La connexion HTTP reste ouverte pendant toute la durée de la génération et
 * le corps de la réponse contient directement l'image — ce qui évite tout
 * problème de timing si le process sd-server s'arrête juste après avoir fini.
 */

const SD_HOST = process.env.SD_HOST ?? '127.0.0.1'
const SD_PORT = process.env.SD_PORT ?? '8081'
const SD_BASE_URL = `http://${SD_HOST}:${SD_PORT}`

// ── Types publics ──────────────────────────────────────────────────────────────

/** LoRA à appliquer lors de la génération (GPU uniquement). */
export interface SdLora {
  /** Chemin vers le fichier LoRA (relatif au lora-model-dir de sd-server). */
  path: string
  /** Multiplicateur LoRA, entre 0.0 et 1.0. */
  multiplier: number
}

/** Paramètres de la requête de génération d'image. */
export interface SdGenerateRequest {
  /** Description positive de l'image à générer. */
  prompt: string
  /** Description négative (éléments à éviter). */
  negative_prompt?: string
  /** Largeur en pixels (défaut : 512). */
  width?: number
  /** Hauteur en pixels (défaut : 512). */
  height?: number
  /** Nombre de pas de débruitage (défaut : 16). */
  steps?: number
  /**
   * Méthode d'échantillonnage (nom sdcpp : 'dpm++2m', 'lcm', etc.).
   * Si omis, le serveur utilise sa valeur par défaut (configurée au démarrage via CLI).
   */
  sampling_method?: string
  /** LoRA à appliquer (GPU uniquement, ignoré silencieusement sur CPU). */
  loras?: SdLora[]
  /** Graine aléatoire pour la reproductibilité (-1 = aléatoire, défaut : -1). */
  seed?: number
}

// ── Types internes — shape de la réponse /sdapi/v1/txt2img ───────────────────

/** Réponse de POST /sdapi/v1/txt2img. */
interface SdapiTxt2ImgResponse {
  /** Tableau d'images encodées en base64 (une par batch). */
  images: string[]
}

// ── Constante ─────────────────────────────────────────────────────────────────

/**
 * Timeout maximal pour la connexion HTTP vers sd-server.
 * La génération SD1.5 prend ~30s sur GPU, jusqu'à ~5 min sur CPU.
 * 15 minutes est une valeur conservatrice.
 */
const GENERATION_TIMEOUT_MS = 15 * 60 * 1000

// ── Fonctions publiques ────────────────────────────────────────────────────────

/**
 * Vérifie si sd-server est joignable en appelant GET /sdcpp/v1/capabilities.
 * Retourne true si l'endpoint répond en 2xx.
 */
export async function checkSdHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${SD_BASE_URL}/sdcpp/v1/capabilities`, {
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Génère une image à partir d'un prompt via l'API synchrone `/sdapi/v1/txt2img`.
 *
 * La connexion HTTP reste ouverte pendant toute la durée de la génération.
 * L'image est retournée directement dans le corps de la réponse une fois prête,
 * ce qui évite tout problème de polling si le process sd-server s'arrête
 * juste après avoir terminé.
 *
 * @throws {Error} Si sd-server est inaccessible, retourne une erreur HTTP ou
 *                 si la réponse ne contient aucune image.
 */
export async function generateImage(request: SdGenerateRequest): Promise<Buffer> {
  const body: Record<string, unknown> = {
    prompt: request.prompt,
    width: request.width ?? 512,
    height: request.height ?? 512,
    seed: request.seed ?? -1,
    steps: request.steps ?? 16,
    cfg_scale: 7.0,
    batch_size: 1,
  }

  if (request.negative_prompt !== undefined) {
    body.negative_prompt = request.negative_prompt
  }

  // sampler_name : si non fourni, le serveur utilise la valeur par défaut
  // configurée au démarrage via --sampling-method (ex: dpm++2m ou lcm).
  if (request.sampling_method) {
    // Mapping sdcpp natif → nom WebUI attendu par sdapi
    const samplerMap: Record<string, string> = {
      'dpm++2m': 'DPM++ 2M',
      'dpm++2mv2': 'DPM++ 2M v2',
      'dpm++2s_a': 'DPM++ 2S a',
      'dpm2': 'DPM2',
      'euler': 'Euler',
      'euler_a': 'Euler a',
      'heun': 'Heun',
      'lcm': 'LCM',
      'ddim_trailing': 'DDIM',
    }
    const mapped = samplerMap[request.sampling_method]
    if (mapped) body.sampler_name = mapped
  }

  if (request.loras && request.loras.length > 0) {
    body.lora = request.loras.map((l) => ({ path: l.path, multiplier: l.multiplier }))
  }

  const jsonBody = JSON.stringify(body)
  const response = await fetch(`${SD_BASE_URL}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody,
    signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`sd-server a retourné HTTP ${response.status} : ${text}`)
  }

  const data = (await response.json()) as SdapiTxt2ImgResponse

  if (!data.images || data.images.length === 0 || !data.images[0]) {
    throw new Error('sd-server n\'a retourné aucune image dans la réponse')
  }

  return Buffer.from(data.images[0], 'base64')
}
