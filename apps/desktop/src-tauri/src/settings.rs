use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Manager;

// ── Struct partagée frontend ↔ backend ────────────────────────────────────────

/// Paramètres de connexion overridables par l'utilisateur.
/// Les valeurs par défaut sont lues depuis les variables d'environnement
/// (elles-mêmes chargées depuis `.env` via dotenvy au démarrage).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub sidecar_host: String,
    pub sidecar_port: u16,
    pub llm_host: String,
    pub llm_port: u16,
    pub sd_host: String,
    pub sd_port: u16,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            sidecar_host: std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            sidecar_port: std::env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3000),
            llm_host: std::env::var("LLM_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            llm_port: std::env::var("LLM_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8080),
            sd_host: std::env::var("SD_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            sd_port: std::env::var("SD_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8081),
        }
    }
}

// ── Chemin du fichier de persistance ─────────────────────────────────────────

fn settings_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("cannot resolve app_config_dir")
        .join("settings.json")
}

// ── Lecture / écriture ────────────────────────────────────────────────────────

/// Charge les settings depuis `app_config_dir/settings.json`.
/// Si le fichier n'existe pas ou est invalide, retourne les valeurs par défaut.
pub fn load_settings(app: &tauri::AppHandle) -> AppSettings {
    let path = settings_path(app);
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

fn save_settings_to_disk(app: &tauri::AppHandle, s: &AppSettings) -> std::io::Result<()> {
    let path = settings_path(app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(s)?;
    fs::write(&path, content)
}

// ── Commandes Tauri ───────────────────────────────────────────────────────────

/// Retourne les settings actuels (fichier JSON ou valeurs par défaut).
///
/// En debug build, `sidecar_host` et `sidecar_port` sont toujours lus depuis
/// les variables d'environnement (chargées depuis `.env` par `load_dotenv`).
/// Le sidecar n'est pas géré par Tauri en dev — il est lancé indépendamment
/// via `pnpm dev:sidecar` et lit lui-même `.env`. Forcer l'alignement ici
/// évite une divergence desktop ↔ sidecar si l'utilisateur a modifié ces
/// champs via l'UI (qui écrit dans `settings.json`, ignoré par le dev sidecar).
#[tauri::command]
pub fn get_settings(app: tauri::AppHandle) -> AppSettings {
    let mut s = load_settings(&app);
    if cfg!(debug_assertions) {
        s.sidecar_host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        s.sidecar_port = std::env::var("PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(3000);
    }
    s
}

/// Persiste les settings dans `app_config_dir/settings.json`.
#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    save_settings_to_disk(&app, &settings).map_err(|e| e.to_string())
}

/// Redémarre l'application Tauri.
#[tauri::command]
pub fn restart_app(app: tauri::AppHandle) {
    app.restart();
}
