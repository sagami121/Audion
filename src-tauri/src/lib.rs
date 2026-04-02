use std::fs;
use base64::{Engine as _, engine::general_purpose};
use lofty::prelude::*;
use lofty::probe::Probe;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use std::sync::Mutex;
use tauri::{Manager, AppHandle, Emitter, State};

struct AppArgs {
    args: Mutex<Vec<String>>,
}

#[tauri::command]
fn get_initial_args(state: State<'_, AppArgs>) -> Vec<String> {
    let mut args = state.args.lock().unwrap();
    std::mem::take(&mut *args) // Return and clear the args
}

#[tauri::command]
fn read_audio_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

#[tauri::command]
fn get_file_metadata(path: String) -> serde_json::Value {
    let filename = std::path::Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    // Strip extension for display name fallback
    let stem = std::path::Path::new(&path)
        .file_stem()
        .and_then(|n| n.to_str())
        .unwrap_or(&filename)
        .to_string();

    let mut title = stem.clone();
    let mut artist = String::new();
    let mut album = String::new();
    let mut picture_base64 = None;
    let mut duration = 0.0;

    // Try to read metadata with lofty; gracefully fall back on failure
    if let Ok(probed) = Probe::open(&path).and_then(|p| p.read()) {
        duration = probed.properties().duration().as_secs_f64();
        let tag = probed.primary_tag().or_else(|| probed.first_tag());
        if let Some(tag) = tag {
            if let Some(t) = tag.title().as_deref() { title = t.to_string(); }
            if let Some(a) = tag.artist().as_deref() { artist = a.to_string(); }
            if let Some(al) = tag.album().as_deref() { album = al.to_string(); }

            if let Some(pic) = tag.pictures().first() {
                let data = pic.data();
                let mime = pic.mime_type().map(|m| m.as_str()).unwrap_or("image/jpeg");
                picture_base64 = Some(format!(
                    "data:{};base64,{}",
                    mime,
                    general_purpose::STANDARD.encode(data)
                ));
            }
        }
    }

    serde_json::json!({
        "path": path,
        "name": title,
        "artist": artist,
        "album": album,
        "cover": picture_base64,
        "filename": filename,
        "duration": duration
    })
}

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppArgs {
            args: Mutex::new(std::env::args().skip(1).collect()), // Skip exe path
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let _ = app.emit("file-open", args);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "表示", true, None::<&str>)?;
            let play_i = MenuItem::with_id(app, "tray-play-pause", "再生 / 一時停止", true, None::<&str>)?;
            let next_i = MenuItem::with_id(app, "tray-next", "次の曲", true, None::<&str>)?;
            let prev_i = MenuItem::with_id(app, "tray-prev", "前の曲", true, None::<&str>)?;
            let sep = tauri::menu::PredefinedMenuItem::separator(app)?;

            let menu = Menu::with_items(app, &[
                &play_i,
                &next_i,
                &prev_i,
                &sep,
                &show_i,
                &quit_i
            ])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app: &AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "tray-play-pause" | "tray-next" | "tray-prev" => {
                        let _ = app.emit(event.id.as_ref(), ());
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_audio_file, get_file_metadata, save_text_file, read_text_file, get_initial_args])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
