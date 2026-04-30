mod llama;
mod settings;
mod stable_diffusion;

use tauri::Manager;

/// Walks up from the current directory to find and load the nearest `.env` file.
fn load_dotenv() {
    if let Ok(mut dir) = std::env::current_dir() {
        loop {
            let candidate = dir.join(".env");
            if candidate.exists() {
                dotenvy::from_path(candidate).ok();
                return;
            }
            if !dir.pop() {
                break;
            }
        }
    }
}

#[cfg(not(debug_assertions))]
mod sidecar {
    use std::sync::Mutex;
    use tauri::Manager;
    use tauri_plugin_shell::{process::CommandChild, ShellExt};

    use crate::settings::AppSettings;

    pub struct SidecarChild(pub Mutex<CommandChild>);

    pub fn spawn(app: &mut tauri::App, s: &AppSettings) -> Result<(), Box<dyn std::error::Error>> {
        let (rx, child) = app
            .shell()
            .sidecar("binaries/sidecar")?
            .env("HOST", &s.sidecar_host)
            .env("PORT", s.sidecar_port.to_string())
            .spawn()?;

        tauri::async_runtime::spawn(async move {
            let mut rx = rx;
            while let Some(_event) = rx.recv().await {}
        });

        app.manage(SidecarChild(Mutex::new(child)));
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    load_dotenv();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(llama::LlmState::new())
        .manage(stable_diffusion::SdState::new())
        .invoke_handler(tauri::generate_handler![
            llama::get_llm_status,
            llama::start_llm_server,
            llama::stop_llm_server,
            stable_diffusion::get_sd_status,
            stable_diffusion::get_sd_config,
            stable_diffusion::start_sd_server,
            stable_diffusion::stop_sd_server,
            settings::get_settings,
            settings::save_settings,
            settings::restart_app,
        ])
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            let s = settings::load_settings(app.handle());

            #[cfg(not(debug_assertions))]
            sidecar::spawn(app, &s)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Arrête sd-server quand l'application se ferme.
            if let tauri::WindowEvent::Destroyed = event {
                stable_diffusion::stop_server(window.app_handle());
                llama::stop_server(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
