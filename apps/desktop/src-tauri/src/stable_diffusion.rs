use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

// ── Constants ─────────────────────────────────────────────────────────────────

const GITHUB_RELEASES_URL: &str =
    "https://api.github.com/repos/leejet/stable-diffusion.cpp/releases/latest";
const STATUS_EVENT: &str = "sd-status";

/// Nom du fichier modèle de base attendu dans models/base/
const BASE_MODEL_FILENAME: &str = "v1-5-pruned-emaonly.safetensors";

/// URL HuggingFace du modèle SD 1.5 pruned (téléchargement automatique si absent)
const HF_BASE_MODEL_URL: &str = "https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors";

/// LoRA disponibles (filename relatif à models/lora/, force GPU)
const LORA_FILES: &[(&str, f32)] = &[
    ("cartoon-fantasy.safetensors", 0.8),
    ("cartoon-sci-fi.safetensors", 0.8),
    ("ui-icon-art.safetensors", 0.7),
];

// ── Status envoyé au frontend ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SdStatus {
    Idle,
    Downloading { downloaded: u64, total: u64 },
    Extracting,
    DownloadingModel { downloaded: u64, total: u64 },
    Starting,
    Ready,
    Stopped,
    Error { message: String },
}

// ── Config d'inférence (GPU vs CPU) ──────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SdLora {
    /// Chemin relatif au lora-model-dir (= filename sans répertoire)
    pub filename: String,
    /// Multiplicateur LoRA passé à l'API d'inférence
    pub strength: f32,
}

/// Paramètres d'inférence à utiliser lors des requêtes POST /sdcpp/v1/img_gen.
/// Exposé au sidecar Node.js via la commande Tauri `get_sd_config`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SdConfig {
    pub width: u32,
    pub height: u32,
    /// Méthode d'échantillonnage : "lcm" (CPU) ou "dpm++2m" (GPU)
    pub sampling: String,
    /// Nombre de pas de débruitage
    pub steps: u32,
    /// LoRA à appliquer (vide sur CPU, rempli sur GPU)
    pub loras: Vec<SdLora>,
    /// `true` si le serveur tourne avec un backend GPU
    pub gpu: bool,
}

impl SdConfig {
    fn for_gpu() -> Self {
        Self {
            width: 512,
            height: 512,
            sampling: "dpm++2m".to_string(),
            steps: 16,
            loras: LORA_FILES
                .iter()
                .map(|(filename, strength)| SdLora {
                    filename: filename.to_string(),
                    strength: *strength,
                })
                .collect(),
            gpu: true,
        }
    }

    fn for_cpu() -> Self {
        Self {
            width: 512,
            height: 512,
            sampling: "lcm".to_string(),
            steps: 6,
            loras: vec![],
            gpu: false,
        }
    }
}

// ── État Tauri géré ───────────────────────────────────────────────────────────

pub struct SdState {
    pub status: Mutex<SdStatus>,
    pub process: Mutex<Option<Child>>,
    /// Config d'inférence calculée au démarrage selon le GPU détecté
    pub config: Mutex<Option<SdConfig>>,
}

impl SdState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(SdStatus::Idle),
            process: Mutex::new(None),
            config: Mutex::new(None),
        }
    }
}

// ── Helpers plateforme ────────────────────────────────────────────────────────

fn binary_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "sd-server.exe"
    } else {
        "sd-server"
    }
}

// ── Sélection de l'asset GitHub ──────────────────────────────────────────────

struct AssetMatcher {
    include: &'static str,
    /// Mots-clés dont aucun ne doit apparaître dans le nom de l'asset
    exclude_all: &'static [&'static str],
}

/// Retourne les matchers en ordre de priorité pour la plateforme + GPU courants.
fn asset_matchers(gpu: &crate::llama::GpuBackend) -> Vec<AssetMatcher> {
    use crate::llama::GpuBackend;

    // Windows x86_64
    if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
        return match gpu {
            GpuBackend::Cuda(_) => vec![
                AssetMatcher { include: "win-cuda12-x64", exclude_all: &[] },
                AssetMatcher { include: "win-vulkan-x64", exclude_all: &[] },
                AssetMatcher { include: "win-avx2-x64", exclude_all: &[] },
            ],
            GpuBackend::Vulkan => vec![
                AssetMatcher { include: "win-vulkan-x64", exclude_all: &[] },
                AssetMatcher { include: "win-avx2-x64", exclude_all: &[] },
            ],
            GpuBackend::None => vec![AssetMatcher { include: "win-avx2-x64", exclude_all: &[] }],
        };
    }

    // macOS arm64 (Metal intégré dans le binaire standard arm64)
    if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        return vec![AssetMatcher { include: "Darwin", exclude_all: &[] }];
    }

    // Linux x86_64 — pas de release CUDA pour Linux, on utilise Vulkan pour les GPU
    match gpu {
        GpuBackend::Cuda(_) | GpuBackend::Vulkan => vec![
            AssetMatcher { include: "x86_64-vulkan", exclude_all: &[] },
            // Fallback CPU si pas de Vulkan dans les assets
            AssetMatcher { include: "Linux", exclude_all: &["vulkan", "rocm"] },
        ],
        GpuBackend::None => {
            vec![AssetMatcher { include: "Linux", exclude_all: &["vulkan", "rocm"] }]
        }
    }
}

fn select_asset<'a>(assets: &'a [GhAsset], matchers: &[AssetMatcher]) -> Option<&'a GhAsset> {
    for matcher in matchers {
        if let Some(asset) = assets.iter().find(|a| {
            (a.name.ends_with(".zip") || a.name.ends_with(".tar.gz"))
                && a.name.contains(matcher.include)
                && !matcher.exclude_all.iter().any(|excl| a.name.contains(excl))
        }) {
            return Some(asset);
        }
    }
    None
}

// ── Chemins ───────────────────────────────────────────────────────────────────

pub fn binary_path(app: &AppHandle, gpu: &crate::llama::GpuBackend) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|d| d.join("stable-diffusion").join(gpu.label()).join(binary_name()))
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))
}

fn models_base_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|d| d.join("models").join("base"))
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))
}

fn models_lora_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|d| d.join("models").join("lora"))
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))
}

// ── Helpers internes ──────────────────────────────────────────────────────────

fn emit(app: &AppHandle, status: SdStatus) {
    if let Ok(mut guard) = app.state::<SdState>().status.lock() {
        *guard = status.clone();
    }
    app.emit(STATUS_EVENT, &status).ok();
}

#[derive(Deserialize)]
struct GhRelease {
    assets: Vec<GhAsset>,
}

#[derive(Deserialize)]
struct GhAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

// ── Téléchargement de sd-server depuis GitHub ─────────────────────────────────

/// Télécharge une archive ZIP depuis `url` et extrait tous ses fichiers dans `dest_dir`.
/// Appelle `on_progress(downloaded, total)` à chaque chunk reçu.
/// Retourne la liste des noms de fichiers extraits (sans chemin de répertoire).
async fn download_zip<F, G>(
    client: &reqwest::Client,
    asset_name: &str,
    url: &str,
    total: u64,
    dest_dir: &std::path::Path,
    on_progress: &mut F,
    on_extract: &mut G,
) -> Result<Vec<String>, String>
where
    F: FnMut(u64, u64),
    G: FnMut(),
{
    let mut resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download '{}': {e}", asset_name))?;

    let mut buf: Vec<u8> = Vec::with_capacity(total as usize);
    let mut downloaded: u64 = 0;
    let mut last_logged_pct = 0u64;

    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("Chunk '{}': {e}", asset_name))? {
        buf.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;
        on_progress(downloaded, total);
        let pct = if total > 0 { downloaded * 100 / total } else { 0 };
        if pct >= last_logged_pct + 10 {
            eprintln!("[sd] {} … {pct}% ({downloaded}/{total})", asset_name);
            last_logged_pct = pct;
        }
    }

    let cursor = std::io::Cursor::new(buf);
    on_extract();
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("Zip '{}': {e}", asset_name))?;
    let mut names: Vec<String> = Vec::new();

    for i in 0..archive.len() {
        let mut entry =
            archive.by_index(i).map_err(|e| format!("Entrée {i} dans '{}': {e}", asset_name))?;
        if entry.is_dir() {
            continue;
        }
        let entry_name = entry.name().to_owned();
        let file_name = std::path::Path::new(&entry_name)
            .file_name()
            .ok_or_else(|| format!("Nom de fichier pour '{entry_name}' dans '{}'", asset_name))?;
        let out_path = dest_dir.join(file_name);
        eprintln!("[sd] extracting '{entry_name}' → {}", out_path.display());
        let mut out = std::fs::File::create(&out_path)
            .map_err(|e| format!("Create '{entry_name}': {e}"))?;
        std::io::copy(&mut entry, &mut out)
            .map_err(|e| format!("Write '{entry_name}': {e}"))?;
        names.push(file_name.to_string_lossy().into_owned());
    }

    eprintln!("[sd] {} entrées extraites depuis '{}'", archive.len(), asset_name);
    Ok(names)
}

async fn download(
    app: &AppHandle,
    dest: &PathBuf,
    gpu: &crate::llama::GpuBackend,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("open-lore-warden/0.1")
        .build()
        .map_err(|e| format!("HTTP client: {e}"))?;

    eprintln!("[sd] fetching release metadata from {GITHUB_RELEASES_URL}");
    let release: GhRelease = client
        .get(GITHUB_RELEASES_URL)
        .send()
        .await
        .map_err(|e| format!("GitHub API request: {e}"))?
        .error_for_status()
        .map_err(|e| format!("GitHub API status: {e}"))?
        .json()
        .await
        .map_err(|e| format!("GitHub API parse: {e}"))?;

    let matchers = asset_matchers(gpu);
    let asset = select_asset(&release.assets, &matchers).ok_or_else(|| {
        "Aucun asset GitHub ne correspond à la plateforme/GPU courants".to_string()
    })?;

    eprintln!("[sd] found asset '{}' ({} bytes)", asset.name, asset.size);
    emit(app, SdStatus::Downloading { downloaded: 0, total: asset.size });

    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Create dir: {e}"))?;
    }
    let dest_dir = dest.parent().ok_or("Cannot resolve sd dir")?;

    // Téléchargement et extraction du binaire principal
    let asset_name = asset.name.clone();
    let asset_url = asset.browser_download_url.clone();
    let asset_size = asset.size;
    let extracted = download_zip(
        &client,
        &asset_name,
        &asset_url,
        asset_size,
        dest_dir,
        &mut |downloaded, total| emit(app, SdStatus::Downloading { downloaded, total }),
        &mut || emit(app, SdStatus::Extracting),
    )
    .await?;

    let bin_name = binary_name();
    if !extracted.iter().any(|f| f == bin_name) {
        let _ = std::fs::remove_dir_all(dest_dir);
        return Err(format!("'{bin_name}' not found inside the zip archive"));
    }

    // Sur Windows avec CUDA : télécharger aussi le redistributable cudart
    // (cudart64_12.dll et autres DLLs) pour qu'ils soient disponibles à côté
    // de sd-server.exe au moment de l'exécution.
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    if matches!(gpu, crate::llama::GpuBackend::Cuda(_)) {
        if let Some(cudart_asset) = release.assets.iter().find(|a| {
            a.name.contains("cudart-sd-bin-win") && a.name.ends_with(".zip")
        }) {
            eprintln!(
                "[sd] téléchargement du redistributable cudart '{}' ({} bytes)…",
                cudart_asset.name, cudart_asset.size
            );
            let cudart_name = cudart_asset.name.clone();
            let cudart_url = cudart_asset.browser_download_url.clone();
            let cudart_size = cudart_asset.size;
            download_zip(
                &client,
                &cudart_name,
                &cudart_url,
                cudart_size,
                dest_dir,
                &mut |_, _| {}, // pas d'événement UI : fichier petit (~5 Mo)
                &mut || {},
            )
            .await?;
            eprintln!("[sd] cudart extrait dans {}", dest_dir.display());
        } else {
            eprintln!("[sd] WARNING: asset cudart introuvable dans la release GitHub — sd-server CUDA pourrait échouer si cudart64_12.dll est absent");
        }
    }

    // Rend le binaire exécutable sur Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(dest, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("chmod: {e}"))?;
    }

    Ok(())
}

// ── Téléchargement du modèle de base depuis HuggingFace ───────────────────────

/// Télécharge `v1-5-pruned-emaonly.safetensors` depuis HuggingFace en streaming
/// direct vers disque. Écrit d'abord dans un `.tmp` pour éviter de laisser un
/// fichier corrompu si le téléchargement s'interrompt.
async fn download_base_model(app: &AppHandle, dest: &PathBuf) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("open-lore-warden/0.1")
        .build()
        .map_err(|e| format!("HTTP client: {e}"))?;

    eprintln!("[sd] téléchargement du modèle de base depuis HuggingFace…");
    eprintln!("[sd] URL: {HF_BASE_MODEL_URL}");

    let resp = client
        .get(HF_BASE_MODEL_URL)
        .send()
        .await
        .map_err(|e| format!("Model download request: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Model download HTTP error: {e}"))?;

    let total = resp.content_length().unwrap_or(0);
    eprintln!("[sd] taille du modèle : {} octets", total);
    emit(app, SdStatus::DownloadingModel { downloaded: 0, total });

    // Crée le répertoire models/base/ si nécessaire
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Create models/base dir: {e}"))?;
    }

    // Écrit dans un fichier temporaire pour éviter les fichiers partiels
    let tmp_path = dest.with_extension("safetensors.tmp");
    {
        use std::io::Write;
        let mut file = std::fs::File::create(&tmp_path)
            .map_err(|e| format!("Create temp model file: {e}"))?;

        let mut downloaded: u64 = 0;
        let mut last_logged_pct = 0u64;
        let mut stream = resp;

        while let Some(chunk) =
            stream.chunk().await.map_err(|e| format!("Model download chunk: {e}"))?
        {
            file.write_all(&chunk).map_err(|e| format!("Write model chunk: {e}"))?;
            downloaded += chunk.len() as u64;
            emit(app, SdStatus::DownloadingModel { downloaded, total });
            let pct = if total > 0 { downloaded * 100 / total } else { 0 };
            if pct >= last_logged_pct + 5 {
                eprintln!("[sd] modèle… {pct}% ({downloaded}/{total} octets)");
                last_logged_pct = pct;
            }
        }
    }

    // Rename atomique : tmp → destination finale
    std::fs::rename(&tmp_path, dest)
        .map_err(|e| format!("Rename model tmp → final: {e}"))?;

    eprintln!("[sd] téléchargement du modèle de base terminé");
    Ok(())
}

// ── Démarrage de sd-server et attente de la disponibilité ─────────────────────

async fn start(
    app: &AppHandle,
    bin: &PathBuf,
    gpu: &crate::llama::GpuBackend,
    host: &str,
    port: u16,
) -> Result<(), String> {
    use crate::llama::GpuBackend;

    let model_path = models_base_dir(app)?.join(BASE_MODEL_FILENAME);
    if !model_path.exists() {
        return Err(format!(
            "Modèle de base introuvable : '{}'. Copiez '{}' dans ce répertoire.",
            model_path.display(),
            BASE_MODEL_FILENAME
        ));
    }

    let use_gpu = matches!(gpu, GpuBackend::Cuda(_) | GpuBackend::Vulkan);
    let config = if use_gpu { SdConfig::for_gpu() } else { SdConfig::for_cpu() };

    // Stocke la config avant de lancer le process
    if let Ok(mut guard) = app.state::<SdState>().config.lock() {
        *guard = Some(config.clone());
    }

    let port_s = port.to_string();
    let mut cmd = Command::new(bin);
    cmd.arg("-m")
        .arg(&model_path)
        .arg("--listen-ip")
        .arg(host)
        .arg("--listen-port")
        .arg(&port_s)
        .arg("--sampling-method")
        .arg(&config.sampling)
        .arg("--steps")
        .arg(config.steps.to_string())
        .arg("-v");

    if use_gpu {
        let lora_dir = models_lora_dir(app)?;
        if lora_dir.exists() {
            cmd.arg("--lora-model-dir").arg(&lora_dir);
            eprintln!("[sd] lora-model-dir: {}", lora_dir.display());
        } else {
            eprintln!(
                "[sd] WARNING: répertoire LoRA '{}' introuvable, --lora-model-dir ignoré",
                lora_dir.display()
            );
        }
    }

    // Vulkan : VRAM partagée et limitée → VAE en tuilé + déchargé sur CPU
    // pour éviter les OOM lors du décodage. Non nécessaire en CUDA (VRAM dédiée)
    // ni en mode CPU (VAE tourne déjà sur CPU).
    if matches!(gpu, GpuBackend::Vulkan) {
        cmd.arg("--vae-tiling").arg("--vae-on-cpu");
    }

    eprintln!(
        "[sd] spawning sd-server: {} -m {} --listen-ip {} --listen-port {} \
        --sampling-method {} --steps {}{}{}",
        bin.display(),
        model_path.display(),
        host,
        port,
        config.sampling,
        config.steps,
        if use_gpu { " [GPU]" } else { " [CPU]" },
        if matches!(gpu, GpuBackend::Vulkan) { " --vae-tiling --vae-on-cpu" } else { "" }
    );

    let child = cmd
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Spawn sd-server: {e}"))?;

    app.state::<SdState>().process.lock().unwrap().replace(child);

    // Poll GET /sdcpp/v1/capabilities jusqu'à ce que le serveur soit prêt.
    // Le chargement du modèle SD1.5 prend généralement 10-60 secondes.
    let url = format!("http://{}:{}/sdcpp/v1/capabilities", host, port);
    let client = reqwest::Client::new();
    let deadline = Instant::now() + Duration::from_secs(600); // 10 min

    eprintln!("[sd] polling {url} until ready (timeout: 10 min)…");
    let mut poll_count = 0u32;
    loop {
        tokio::time::sleep(Duration::from_secs(3)).await;
        poll_count += 1;

        if Instant::now() > deadline {
            return Err("sd-server n'est pas devenu disponible dans les 10 minutes".to_string());
        }

        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                eprintln!("[sd] sd-server ready after {poll_count} polls");
                emit(app, SdStatus::Ready);
                return Ok(());
            }
            Ok(resp) => {
                if poll_count % 10 == 0 {
                    eprintln!("[sd] poll #{poll_count}: HTTP {}", resp.status());
                }
            }
            Err(e) => {
                if poll_count % 10 == 0 {
                    eprintln!("[sd] poll #{poll_count}: {e}");
                }
            }
        }
    }
}

// ── Détection GPU spécifique à sd-server ─────────────────────────────────────

/// Sur Windows, vérifie que le pilote CUDA NVIDIA est bien présent via `nvcuda.dll`.
/// `nvcuda.dll` est le pilote CUDA lui-même (pas le toolkit) : sa présence suffit à
/// confirmer qu'un GPU NVIDIA CUDA est disponible. Le runtime cudart (cudart64_12.dll)
/// nécessaire à sd-server sera fourni par le ZIP redistributable téléchargé
/// automatiquement aux côtés du binaire sd-server.
#[cfg(target_os = "windows")]
fn is_cuda_runtime_available(_ver: &str) -> bool {
    std::path::Path::new(r"C:\Windows\System32\nvcuda.dll").exists()
}

#[cfg(not(target_os = "windows"))]
fn is_cuda_runtime_available(_ver: &str) -> bool {
    // Sur Linux, si nvidia-smi répond, le runtime CUDA est en général disponible.
    true
}

/// Détecte le backend GPU à utiliser pour sd-server.
/// Identique à `llama::detect_gpu_backend()` mais avec une vérification
/// supplémentaire de la présence du pilote CUDA — sans impact sur llama.cpp.
fn detect_sd_gpu_backend() -> crate::llama::GpuBackend {
    use crate::llama::GpuBackend;

    match crate::llama::detect_gpu_backend() {
        GpuBackend::Cuda(ver) if !is_cuda_runtime_available(&ver) => {
            let major = ver.split('.').next().unwrap_or("12");
            eprintln!(
                "[sd] CUDA {ver} détecté via nvidia-smi mais nvcuda.dll (majeur={major}) absent \
                → bascule sur Vulkan/CPU"
            );
            // Vérifie Vulkan comme fallback GPU
            if cfg!(all(target_os = "windows", target_arch = "x86_64"))
                && std::path::Path::new(r"C:\Windows\System32\vulkan-1.dll").exists()
            {
                eprintln!("[sd] vulkan-1.dll trouvé → utilisation du backend Vulkan");
                GpuBackend::Vulkan
            } else {
                eprintln!("[sd] Vulkan non disponible → bascule sur CPU");
                GpuBackend::None
            }
        }
        other => other,
    }
}

// ── API publique ──────────────────────────────────────────────────────────────

/// Démarre sd-server en arrière-plan : télécharge le binaire si absent, puis lance.
/// Appelé à la demande depuis le flux d'import (pas au démarrage de l'application).
pub async fn start_server(app: AppHandle, sd_host: String, sd_port: u16) {
    let gpu = detect_sd_gpu_backend();

    let bin = match binary_path(&app, &gpu) {
        Ok(p) => p,
        Err(msg) => {
            eprintln!("[sd] ERROR resolving binary path: {msg}");
            emit(&app, SdStatus::Error { message: msg });
            return;
        }
    };

    eprintln!("[sd] backend: {}, binary path: {}", gpu.label(), bin.display());

    if bin.exists() {
        eprintln!("[sd] binaire déjà présent, téléchargement ignoré");
    } else {
        eprintln!("[sd] binaire absent, démarrage du téléchargement…");
        if let Err(msg) = download(&app, &bin, &gpu).await {
            eprintln!("[sd] ERROR during download: {msg}");
            emit(&app, SdStatus::Error { message: msg });
            return;
        }
        eprintln!("[sd] téléchargement terminé");
    }

    // Vérifie la présence du modèle de base, le télécharge depuis HuggingFace si absent
    let model_path = match models_base_dir(&app) {
        Ok(d) => d.join(BASE_MODEL_FILENAME),
        Err(msg) => {
            eprintln!("[sd] ERROR resolving models dir: {msg}");
            emit(&app, SdStatus::Error { message: msg });
            return;
        }
    };

    if model_path.exists() {
        eprintln!("[sd] modèle de base déjà présent, téléchargement ignoré");
    } else {
        eprintln!("[sd] modèle de base absent, téléchargement depuis HuggingFace…");
        if let Err(msg) = download_base_model(&app, &model_path).await {
            eprintln!("[sd] ERROR during model download: {msg}");
            emit(&app, SdStatus::Error { message: msg });
            return;
        }
    }

    emit(&app, SdStatus::Starting);

    match start(&app, &bin, &gpu, &sd_host, sd_port).await {
        Err(msg) => {
            eprintln!("[sd] ERROR during start: {msg}");
            emit(&app, SdStatus::Error { message: msg });
        }
        Ok(()) => {
            // sd-server est Ready — on démarre une tâche de surveillance
            // pour détecter si le process s'arrête de façon inattendue.
            let app_monitor = app.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::time::sleep(Duration::from_secs(3)).await;

                    let exited = {
                        let sd_state = app_monitor.state::<SdState>();
                        let mut guard = sd_state.process.lock().unwrap();
                        match guard.as_mut() {
                            // Process retiré par stop_server → arrêt normal, on sort.
                            None => break,
                            Some(child) => match child.try_wait() {
                                Ok(Some(status)) => {
                                    eprintln!(
                                        "[sd] [monitor] process exited with status: {:?}",
                                        status
                                    );
                                    true
                                }
                                Ok(None) => false, // toujours en vie
                                Err(e) => {
                                    eprintln!("[sd] [monitor] try_wait error: {e}");
                                    false
                                }
                            },
                        }
                    };

                    if exited {
                        // Si stop_server n'a pas été appelé, c'est un arrêt inattendu.
                        let current =
                            app_monitor.state::<SdState>().status.lock().unwrap().clone();
                        if !matches!(current, SdStatus::Stopped) {
                            eprintln!("[sd] [monitor] sd-server s'est arrêté de façon inattendue");
                            emit(
                                &app_monitor,
                                SdStatus::Error {
                                    message:
                                        "sd-server s'est arrêté de façon inattendue. \
                                        Relancez-le pour générer de nouvelles images."
                                            .to_string(),
                                },
                            );
                        }
                        break;
                    }
                }
            });
        }
    }
}

/// Arrête sd-server (SIGKILL) et émet `Stopped`.
pub fn stop_server(app: &AppHandle) {
    let state = app.state::<SdState>();
    if let Ok(mut guard) = state.process.lock() {
        if let Some(mut child) = guard.take() {
            child.kill().ok();
            child.wait().ok();
            eprintln!("[sd] sd-server arrêté");
        }
    }
    emit(app, SdStatus::Stopped);
}

// ── Commandes Tauri ───────────────────────────────────────────────────────────

/// Retourne le statut SD courant (utile au montage du composant avant le premier événement).
#[tauri::command]
pub fn get_sd_status(state: tauri::State<SdState>) -> SdStatus {
    state.status.lock().unwrap().clone()
}

/// Retourne la config d'inférence (méthode, pas, LoRA) calculée selon le GPU détecté.
/// `None` si le serveur n'a jamais été démarré dans cette session.
#[tauri::command]
pub fn get_sd_config(state: tauri::State<SdState>) -> Option<SdConfig> {
    state.config.lock().unwrap().clone()
}

/// Démarre sd-server en arrière-plan (non bloquant).
/// Si le serveur est déjà en cours de démarrage ou prêt, l'appel est ignoré.
#[tauri::command]
pub fn start_sd_server(app: tauri::AppHandle) {
    // Vérifie si déjà en cours ou prêt
    {
        let state = app.state::<SdState>();
        let status = state.status.lock().unwrap().clone();
        let already_running = matches!(
            status,
            SdStatus::Ready
                | SdStatus::Starting
                | SdStatus::Downloading { .. }
                | SdStatus::Extracting
                | SdStatus::DownloadingModel { .. }
        );
        if already_running {
            eprintln!("[sd] start_sd_server: serveur déjà en cours d'exécution/démarrage, ignoré");
            return;
        }
    }
    let s = crate::settings::load_settings(&app);
    tauri::async_runtime::spawn(start_server(app, s.sd_host, s.sd_port));
}

/// Arrête sd-server immédiatement.
#[tauri::command]
pub fn stop_sd_server(app: tauri::AppHandle) {
    stop_server(&app);
}
