use std::fs;
use base64::{Engine as _, engine::general_purpose};
use lofty::prelude::*;
use lofty::probe::Probe;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use std::sync::Mutex;
use tauri::{Manager, AppHandle, Emitter, State};
use serde::Serialize;

struct AppArgs {
    args: Mutex<Vec<String>>,
}

#[derive(Serialize)]
struct ReleaseInfo {
    tag_name: String,
    body: String,
    assets: Vec<ReleaseAsset>,
}

#[derive(Serialize)]
struct ReleaseAsset {
    name: String,
    browser_download_url: String,
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

#[tauri::command]
fn get_lyrics(path: String) -> Result<String, String> {
    let lrc_path = std::path::Path::new(&path).with_extension("lrc");
    if lrc_path.exists() {
        fs::read_to_string(lrc_path).map_err(|e| e.to_string())
    } else {
        Err("No lyrics found".to_string())
    }
}

#[tauri::command]
fn get_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn fetch_latest_release_info() -> Result<ReleaseInfo, String> {
    let latest_url = "https://github.com/sagami121/Audion/releases/latest";
    let client = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("Audion-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(latest_url).send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub {}", response.status()));
    }

    let resolved_url = response.url().to_string();
    let tag = resolved_url
        .split("/releases/tag/")
        .nth(1)
        .and_then(|value| value.split(['?', '#']).next())
        .map(|value| value.to_string())
        .ok_or_else(|| "Latest release tag not found".to_string())?;

    let version = tag.trim_start_matches(['v', 'V']);
    let body = fetch_release_notes_from_atom(&client, &tag).unwrap_or_default();
    let assets = vec![
        ReleaseAsset {
            name: format!("Audion_{}_x64_ja-JP.msi", version),
            browser_download_url: format!("https://github.com/sagami121/Audion/releases/download/{}/Audion_{}_x64_ja-JP.msi", tag, version),
        },
        ReleaseAsset {
            name: format!("Audion_v{}_x64_ja-JP.msi", version),
            browser_download_url: format!("https://github.com/sagami121/Audion/releases/download/{}/Audion_v{}_x64_ja-JP.msi", tag, version),
        },
    ];

    Ok(ReleaseInfo {
        tag_name: tag,
        body,
        assets,
    })
}

fn fetch_release_notes_from_atom(client: &reqwest::blocking::Client, tag: &str) -> Result<String, String> {
    let atom_url = "https://github.com/sagami121/Audion/releases.atom";
    let response = client.get(atom_url).send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("GitHub {}", response.status()));
    }

    let xml = response.text().map_err(|e| e.to_string())?;
    let target = normalize_release_tag(tag);

    for entry in xml.split("<entry>").skip(1) {
        let title = extract_xml_tag(entry, "title").unwrap_or_default();
        let entry_tag = normalize_release_tag(title.trim());
        if entry_tag != target {
            continue;
        }

        let content = extract_xml_tag(entry, "content").unwrap_or_default();
        let decoded = decode_html_entities(&content);
        let text = html_to_text(&decoded);
        return Ok(text.trim().to_string());
    }

    Ok(String::new())
}

fn extract_xml_tag<'a>(xml: &'a str, tag: &str) -> Option<&'a str> {
    let start = xml.find(&format!("<{}", tag))?;
    let rest = &xml[start..];
    let start_end = rest.find('>')?;
    let content_start = start + start_end + 1;
    let end = xml[content_start..].find(&format!("</{}>", tag))?;
    Some(&xml[content_start..content_start + end])
}

fn normalize_release_tag(tag: &str) -> String {
    tag.trim().trim_start_matches(['v', 'V']).to_string()
}

fn decode_html_entities(input: &str) -> String {
    input
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

fn html_to_text(input: &str) -> String {
    let mut text = input
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("</p>", "\n\n")
        .replace("</li>", "\n")
        .replace("</h1>", "\n")
        .replace("</h2>", "\n")
        .replace("</h3>", "\n")
        .replace("</pre>", "\n");

    let mut out = String::new();
    let mut in_tag = false;
    for ch in text.drain(..) {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }

    let mut normalized = String::new();
    let mut prev_newline = 0;
    for ch in out.chars() {
        if ch == '\n' {
            prev_newline += 1;
            if prev_newline <= 2 {
                normalized.push(ch);
            }
        } else {
            prev_newline = 0;
            normalized.push(ch);
        }
    }

    normalized
}

#[tauri::command]
fn download_installer(asset_url: String, file_name: String) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent("Audion-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(&asset_url).send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Installer download failed: {}", response.status()));
    }

    let bytes = response.bytes().map_err(|e| e.to_string())?;
    let path = std::env::temp_dir().join(&file_name);
    fs::write(&path, &bytes).map_err(|e| e.to_string())?;

    path.into_os_string()
        .into_string()
        .map_err(|_| "Failed to resolve installer path".to_string())
}

#[tauri::command]
fn run_installer(app: AppHandle, path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        if path.ends_with(".msi") {
            std::process::Command::new("msiexec")
                .arg("/i")
                .arg(&path)
                .arg("/passive")
                .spawn()
                .map_err(|e: std::io::Error| e.to_string())?;
            return Ok(());
        }
    }

    // Tauri v2 の opener プラグインを使用してファイルを開く
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())?;

    Ok(())
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
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Filter music files for file-open (skip the first arg which is usually the exe path)
            let music_files: Vec<String> = args.iter().skip(1).filter(|a| !a.starts_with("audion://")).cloned().collect();
            if !music_files.is_empty() {
                let _ = app.emit("file-open", music_files);
            }

            // Filter deep links for audion://
            let deep_links: Vec<String> = args.iter().filter(|a| a.starts_with("audion://")).cloned().collect();
            if !deep_links.is_empty() {
                let _ = app.emit("deep-link", deep_links);
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    let urls: Vec<String> = event.urls().iter().map(|u| u.to_string()).collect();
                    let _ = handle.emit("deep-link", urls);
                });

                // Register the scheme at runtime (important for Windows dev mode)
                if let Err(e) = app.deep_link().register("audion") {
                    eprintln!("Failed to register deep link scheme: {}", e);
                }
            }

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
        .invoke_handler(tauri::generate_handler![
            read_audio_file,
            get_file_metadata,
            save_text_file,
            read_text_file,
            get_initial_args,
            get_lyrics,
            get_version,
            fetch_latest_release_info,
            download_installer,
            run_installer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
