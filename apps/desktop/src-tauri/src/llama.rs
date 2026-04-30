use std::{
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

// ── Constants ─────────────────────────────────────────────────────────────────

const HF_REPO: &str = "ggml-org/gemma-4-E4B-it-GGUF";
/// 128 * 1024 = 128 K context tokens
const CTX_SIZE: &str = "131072";
const GITHUB_RELEASES_URL: &str =
    "https://api.github.com/repos/ggml-org/llama.cpp/releases/latest";
const STATUS_EVENT: &str = "llm-status";

// ── Status sent to the frontend ───────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum LlmStatus {
    Idle,
    Downloading { downloaded: u64, total: u64 },
    Extracting,
    Starting,
    Ready,
    Error { message: String },
}

// ── Managed Tauri state ───────────────────────────────────────────────────────

pub struct LlmState {
    pub status: Mutex<LlmStatus>,
    pub process: Mutex<Option<Child>>,
}

impl LlmState {
    pub fn new() -> Self {
        Self {
            status: Mutex::new(LlmStatus::Idle),
            process: Mutex::new(None),
        }
    }
}

// ── Platform helpers ──────────────────────────────────────────────────────────

fn binary_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "llama-server.exe"
    } else {
        "llama-server"
    }
}

// ── GPU backend detection ─────────────────────────────────────────────────────

/// Which GPU acceleration backend is available on this machine.
#[derive(Debug, Clone)]
pub enum GpuBackend {
    /// NVIDIA CUDA – contains the detected runtime version, e.g. `"12.4"`.
    Cuda(String),
    /// Vulkan (Windows only – NVIDIA, AMD, and Intel GPUs).
    Vulkan,
    /// No GPU detected; fall back to CPU-only.
    None,
}

impl GpuBackend {
    pub fn label(&self) -> &str {
        match self {
            GpuBackend::Cuda(_) => "cuda",
            GpuBackend::Vulkan => "vulkan",
            GpuBackend::None => "cpu",
        }
    }
}

/// Detect available GPU acceleration by probing the system at runtime.
pub fn detect_gpu_backend() -> GpuBackend {
    // macOS arm64: Metal is compiled into the standard arm64 build – no special asset needed.
    if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        eprintln!("[llama] GPU: macOS arm64 – Metal acceleration is built in");
        return GpuBackend::None;
    }

    // Try NVIDIA CUDA first (Windows x64 and Linux x64).
    if let Some(ver) = detect_cuda_version() {
        eprintln!("[llama] GPU: NVIDIA CUDA {ver} detected");
        return GpuBackend::Cuda(ver);
    }

    // Try Vulkan (Windows only – covers NVIDIA, AMD, Intel GPUs).
    if cfg!(all(target_os = "windows", target_arch = "x86_64"))
        && std::path::Path::new(r"C:\Windows\System32\vulkan-1.dll").exists()
    {
        eprintln!("[llama] GPU: Vulkan detected");
        return GpuBackend::Vulkan;
    }

    eprintln!("[llama] GPU: no acceleration found, falling back to CPU");
    GpuBackend::None
}

/// Probe `nvidia-smi` to retrieve the installed CUDA runtime version (e.g. `"12.4"`).
/// Returns `None` on non-CUDA platforms or when NVIDIA drivers are absent.
fn detect_cuda_version() -> Option<String> {
    if !cfg!(any(
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64")
    )) {
        return None;
    }
    let output = std::process::Command::new("nvidia-smi").output().ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .find_map(|line| {
            let pos = line.find("CUDA Version:")?;
            let after = line[pos + "CUDA Version:".len()..].trim();
            after.split_whitespace().next().map(str::to_owned)
        })
}

/// Asset name keywords to try, in priority order. The first matching release
/// asset wins; later entries serve as fallbacks.
fn asset_keywords(gpu: &GpuBackend) -> Vec<String> {
    let (cuda_prefix, vulkan_kw, cpu_kw): (&str, Option<&str>, &str) =
        if cfg!(all(target_os = "windows", target_arch = "x86_64")) {
            ("bin-win-cuda-cu", Some("bin-win-vulkan-x64"), "bin-win-cpu-x64")
        } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
            ("", None, "bin-macos-arm64")
        } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
            ("", None, "bin-macos-x64")
        } else {
            ("bin-ubuntu-cuda-cu", None, "bin-ubuntu-x64")
        };

    match gpu {
        GpuBackend::Cuda(ver) if !cuda_prefix.is_empty() => {
            let major = ver.split('.').next().unwrap_or(ver.as_str()).to_owned();
            let mut kws = vec![
                format!("{cuda_prefix}{ver}-x64"),
                format!("{cuda_prefix}{major}"),
            ];
            if let Some(vk) = vulkan_kw {
                kws.push(vk.to_string());
            }
            kws.push(cpu_kw.to_string());
            kws
        }
        GpuBackend::Vulkan => {
            let mut kws = Vec::new();
            if let Some(vk) = vulkan_kw {
                kws.push(vk.to_string());
            }
            kws.push(cpu_kw.to_string());
            kws
        }
        _ => vec![cpu_kw.to_string()],
    }
}

pub fn binary_path(app: &AppHandle, gpu: &GpuBackend) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|d| d.join("llama").join(gpu.label()).join(binary_name()))
        .map_err(|e| format!("Cannot resolve app data dir: {e}"))
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn emit(app: &AppHandle, status: LlmStatus) {
    if let Ok(mut guard) = app.state::<LlmState>().status.lock() {
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

// ── Public API ────────────────────────────────────────────────────────────────

pub async fn start_server(app: AppHandle, llm_host: String, llm_port: u16) {
    let gpu = detect_gpu_backend();

    let bin = match binary_path(&app, &gpu) {
        Ok(p) => p,
        Err(msg) => {
            eprintln!("[llama] ERROR resolving binary path: {msg}");
            emit(&app, LlmStatus::Error { message: msg });
            return;
        }
    };

    eprintln!("[llama] backend: {}, binary path: {}", gpu.label(), bin.display());

    if bin.exists() {
        eprintln!("[llama] binary already present, skipping download");
    } else {
        eprintln!("[llama] binary not found, starting download…");
        if let Err(msg) = download(&app, &bin, &gpu).await {
            eprintln!("[llama] ERROR during download: {msg}");
            emit(&app, LlmStatus::Error { message: msg });
            return;
        }
        eprintln!("[llama] download complete");
    }

    emit(&app, LlmStatus::Starting);

    if let Err(msg) = start(&app, &bin, &gpu, &llm_host, llm_port).await {
        eprintln!("[llama] ERROR during start: {msg}");
        emit(&app, LlmStatus::Error { message: msg });
    }
}

pub fn stop_server(app: &AppHandle) {
    let state = app.state::<LlmState>();
    if let Ok(mut guard) = state.process.lock() {
        if let Some(mut child) = guard.take() {
            child.kill().ok();
            child.wait().ok();
            eprintln!("[llama] llama-server stopped");
        }
    }
    emit(app, LlmStatus::Idle);
}

// ── Download llama-server binary from GitHub ──────────────────────────────────

async fn download(app: &AppHandle, dest: &PathBuf, gpu: &GpuBackend) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("open-lore-warden/0.1")
        .build()
        .map_err(|e| format!("HTTP client: {e}"))?;

    // Fetch latest release metadata
    eprintln!("[llama] fetching release metadata from {GITHUB_RELEASES_URL}");
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

    let keywords = asset_keywords(gpu);
    eprintln!("[llama] asset candidates (in priority order): {keywords:?}");
    let asset = keywords
        .iter()
        .find_map(|kw| {
            release.assets.iter().find(|a| {
                a.name.contains(kw.as_str())
                    && (a.name.ends_with(".zip") || a.name.ends_with(".tar.gz"))
            })
        })
        .ok_or_else(|| format!("No release asset matched any of: {keywords:?}"))?;

    eprintln!("[llama] found asset '{}' ({} bytes)", asset.name, asset.size);

    emit(app, LlmStatus::Downloading { downloaded: 0, total: asset.size });

    // Stream the zip into memory, emitting progress
    let mut resp = client
        .get(&asset.browser_download_url)
        .send()
        .await
        .map_err(|e| format!("Download request: {e}"))?;

    let total = asset.size;
    let mut buf: Vec<u8> = Vec::with_capacity(total as usize);
    let mut downloaded: u64 = 0;

    let mut last_logged_pct = 0u64;
    while let Some(chunk) = resp.chunk().await.map_err(|e| format!("Download chunk: {e}"))? {
        buf.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;
        emit(app, LlmStatus::Downloading { downloaded, total });
        let pct = if total > 0 { downloaded * 100 / total } else { 0 };
        if pct >= last_logged_pct + 10 {
            eprintln!("[llama] downloading… {pct}% ({downloaded}/{total} bytes)");
            last_logged_pct = pct;
        }
    }

    emit(app, LlmStatus::Extracting);

    // Create destination directory
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Create dir: {e}"))?;
    }

    // Extract all files from the zip into the destination directory
    let dest_dir = dest.parent().ok_or("Cannot resolve llama dir")?;
    let cursor = std::io::Cursor::new(buf);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| format!("Zip open: {e}"))?;
    
    let bin_name = binary_name();
    let mut found = false;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| format!("Zip entry {i}: {e}"))?;
        // Skip directory entries
        if entry.is_dir() {
            continue;
        }

        let entry_name = entry.name().to_owned();
        // Flatten the path: only keep the file name (ignore subdirectory structure in zip)
        let file_name = std::path::Path::new(&entry_name)
            .file_name()
            .ok_or_else(|| format!("Cannot get file name for zip entry '{entry_name}'"))?;
        let out_path = dest_dir.join(file_name);

        eprintln!("[llama] extracting '{entry_name}' → {}", out_path.display());
        let mut out =
            std::fs::File::create(&out_path).map_err(|e| format!("Create '{entry_name}': {e}"))?;
        std::io::copy(&mut entry, &mut out).map_err(|e| format!("Write '{entry_name}': {e}"))?;

        if entry_name.ends_with(bin_name) {
            found = true;
        }
    }

    eprintln!("[llama] extraction done ({} entries)", archive.len());
    
    if !found {
        // Clean up on failure
        let _ = std::fs::remove_dir_all(dest_dir);
        return Err(format!("'{bin_name}' not found inside the zip archive"));
    }

    // Make the binary executable on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(dest, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("chmod: {e}"))?;
    }

    Ok(())
}

// ── Start llama-server and wait until it is ready ─────────────────────────────

async fn start(app: &AppHandle, bin: &PathBuf, gpu: &GpuBackend, host: &str, port: u16) -> Result<(), String> {
    // `llama-server -hf <repo> --port N --host H --ctx-size N --jinja`
    let port_s = port.to_string();

    let use_gpu = matches!(gpu, GpuBackend::Cuda(_) | GpuBackend::Vulkan);
    let ngl_info = if use_gpu { " --n-gpu-layers -1" } else { "" };
    eprintln!("[llama] spawning llama-server: {} -hf {HF_REPO} --port {port_s} --host {host} --ctx-size {CTX_SIZE} --jinja{ngl_info}", bin.display());
    let mut cmd = Command::new(bin);
    cmd.arg("-hf")
        .arg(HF_REPO)
        .arg("--port")
        .arg(&port_s)
        .arg("--host")
        .arg(host)
        .arg("--ctx-size")
        .arg(CTX_SIZE)
        .arg("--jinja");
    if use_gpu {
        // Offload all layers to the GPU
        cmd.arg("--n-gpu-layers").arg("-1");
    }
    let child = cmd
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("Spawn llama-server: {e}"))?;

    app.state::<LlmState>().process.lock().unwrap().replace(child);

    // Poll /health until ready.
    // On first run, llama-server downloads the model from HuggingFace,
    // which may take tens of minutes depending on the network.
    let url = format!("http://{}:{}/health", host, port);
    let client = reqwest::Client::new();
    let deadline = Instant::now() + Duration::from_secs(1800); // 30 min

    eprintln!("[llama] polling {url} until ready (timeout: 30 min)…");
    let mut poll_count = 0u32;
    loop {
        tokio::time::sleep(Duration::from_secs(3)).await;
        poll_count += 1;

        if Instant::now() > deadline {
            return Err("llama-server did not become ready within 30 minutes".to_string());
        }

        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                eprintln!("[llama] llama-server ready after {poll_count} polls");
                emit(app, LlmStatus::Ready);
                return Ok(());
            }
            Ok(resp) => {
                if poll_count % 10 == 0 {
                    eprintln!("[llama] poll #{poll_count}: HTTP {}", resp.status());
                }
            }
            Err(e) => {
                if poll_count % 10 == 0 {
                    eprintln!("[llama] poll #{poll_count}: {e}");
                }
            }
        }
    }
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Returns the current LLM status synchronously (useful on component mount
/// before the first event arrives).
#[tauri::command]
pub fn get_llm_status(state: tauri::State<LlmState>) -> LlmStatus {
    state.status.lock().unwrap().clone()
}

/// Starts llama-server in the background.
/// If the server is already starting/running, the call is ignored.
#[tauri::command]
pub fn start_llm_server(app: tauri::AppHandle) {
    {
        let state = app.state::<LlmState>();
        let status = state.status.lock().unwrap().clone();
        let mut process_guard = state.process.lock().unwrap();
        let process_running = match process_guard.as_mut().map(|child| child.try_wait()) {
            Some(Ok(Some(exit_status))) => {
                eprintln!("[llama] start_llm_server: previous process already exited: {exit_status}");
                process_guard.take();
                false
            }
            Some(Ok(None)) => true,
            Some(Err(e)) => {
                eprintln!("[llama] start_llm_server: cannot query process state: {e}");
                true
            }
            None => false,
        };
        let already_running = matches!(
            status,
            LlmStatus::Ready | LlmStatus::Starting | LlmStatus::Downloading { .. } | LlmStatus::Extracting
        ) || process_running;
        if already_running {
            eprintln!("[llama] start_llm_server: server already running/starting, ignoring");
            return;
        }
    }

    let s = crate::settings::load_settings(&app);
    tauri::async_runtime::spawn(start_server(app, s.llm_host, s.llm_port));
}

/// Stops llama-server immediately.
#[tauri::command]
pub fn stop_llm_server(app: tauri::AppHandle) {
    stop_server(&app);
}
