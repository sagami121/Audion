use std::fs;
use base64::{Engine as _, engine::general_purpose};
use lofty::prelude::*;
use lofty::probe::Probe;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, AppHandle, Emitter, State};
use serde::Serialize;
use tauri_plugin_opener::OpenerExt;

mod discord_rpc;
use discord_rpc::{DiscordState, set_discord_presence, clear_discord_presence};
use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;
use discord_presence::Client;

struct AppArgs {
    args: TokioMutex<Vec<String>>,
}

#[cfg(target_os = "windows")]
mod windows_taskbar {
    use image::load_from_memory;
    use std::ffi::c_void;
    use std::mem::size_of;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::OnceLock;
    use tauri::{AppHandle, Emitter, Manager};
    use windows::core::w;
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
    use windows::Win32::Graphics::Gdi::{
        CreateBitmap, CreateDIBSection, DeleteObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB,
        DIB_RGB_COLORS,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
        COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::UI::Shell::{
        DefSubclassProc, ITaskbarList3, SetWindowSubclass, TaskbarList, THB_FLAGS, THB_ICON,
        THB_TOOLTIP, THBF_ENABLED, THBN_CLICKED, THUMBBUTTON,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateIconIndirect, RegisterWindowMessageW, HICON, ICONINFO, WM_COMMAND,
    };

    static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();
    static TASKBAR_BUTTON_CREATED_MSG: OnceLock<u32> = OnceLock::new();
    static PREV_ICON: OnceLock<usize> = OnceLock::new();
    static PLAY_ICON: OnceLock<usize> = OnceLock::new();
    static PAUSE_ICON: OnceLock<usize> = OnceLock::new();
    static NEXT_ICON: OnceLock<usize> = OnceLock::new();
    static IS_PLAYING: AtomicBool = AtomicBool::new(false);

    const SUBCLASS_ID: usize = 0xA0D101;
    const BTN_PREV: u32 = 41001;
    const BTN_PLAY_PAUSE: u32 = 41002;
    const BTN_NEXT: u32 = 41003;
    const PREV_ICON_PNG: &[u8] = include_bytes!("../icons/taskbar_prev.png");
    const PLAY_ICON_PNG: &[u8] = include_bytes!("../icons/taskbar_play.png");
    const PAUSE_ICON_PNG: &[u8] = include_bytes!("../icons/taskbar_pause.png");
    const NEXT_ICON_PNG: &[u8] = include_bytes!("../icons/taskbar_next.png");

    fn set_tooltip(dest: &mut [u16; 260], text: &str) {
        let mut utf16: Vec<u16> = text.encode_utf16().collect();
        if utf16.len() >= dest.len() {
            utf16.truncate(dest.len() - 1);
        }
        for (i, ch) in utf16.iter().enumerate() {
            dest[i] = *ch;
        }
        dest[utf16.len()] = 0;
    }

    fn make_button(
        id: u32,
        icon: windows::Win32::UI::WindowsAndMessaging::HICON,
        tip: &str,
    ) -> THUMBBUTTON {
        let mut button = THUMBBUTTON {
            dwMask: THB_FLAGS | THB_ICON | THB_TOOLTIP,
            iId: id,
            iBitmap: 0,
            hIcon: icon,
            szTip: [0; 260],
            dwFlags: THBF_ENABLED,
        };
        set_tooltip(&mut button.szTip, tip);
        button
    }

    fn create_hicon_from_png(png: &[u8]) -> Result<HICON, String> {
        let image = load_from_memory(png).map_err(|e| e.to_string())?.to_rgba8();
        let (width, height) = image.dimensions();
        let mut bgra = Vec::with_capacity((width * height * 4) as usize);
        for p in image.pixels() {
            let [r, g, b, a] = p.0;
            bgra.extend_from_slice(&[b, g, r, a]);
        }

        unsafe {
            let mut bmi = BITMAPINFO::default();
            bmi.bmiHeader = BITMAPINFOHEADER {
                biSize: size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width as i32,
                biHeight: -(height as i32),
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            };

            let mut bits: *mut c_void = std::ptr::null_mut();
            let color = CreateDIBSection(None, &bmi, DIB_RGB_COLORS, &mut bits, None, 0)
                .map_err(|e| e.to_string())?;
            if bits.is_null() {
                return Err("Failed to create icon bitmap".to_string());
            }
            std::ptr::copy_nonoverlapping(bgra.as_ptr(), bits as *mut u8, bgra.len());

            let mask = CreateBitmap(width as i32, height as i32, 1, 1, None);
            if mask.0.is_null() {
                let _ = DeleteObject(color.into());
                return Err("Failed to create icon mask".to_string());
            }

            let icon_info = ICONINFO {
                fIcon: true.into(),
                xHotspot: 0,
                yHotspot: 0,
                hbmMask: mask,
                hbmColor: color,
            };
            let icon = CreateIconIndirect(&icon_info).map_err(|e| e.to_string())?;

            let _ = DeleteObject(color.into());
            let _ = DeleteObject(mask.into());
            Ok(icon)
        }
    }

    fn get_prev_icon() -> Result<HICON, String> {
        if let Some(icon) = PREV_ICON.get() {
            return Ok(HICON(*icon as *mut c_void));
        }
        let icon = create_hicon_from_png(PREV_ICON_PNG)?;
        let _ = PREV_ICON.set(icon.0 as usize);
        Ok(HICON(
            *PREV_ICON.get().expect("prev icon should be initialized") as *mut c_void,
        ))
    }

    fn get_play_icon() -> Result<HICON, String> {
        if let Some(icon) = PLAY_ICON.get() {
            return Ok(HICON(*icon as *mut c_void));
        }
        let icon = create_hicon_from_png(PLAY_ICON_PNG)?;
        let _ = PLAY_ICON.set(icon.0 as usize);
        Ok(HICON(
            *PLAY_ICON.get().expect("play icon should be initialized") as *mut c_void,
        ))
    }

    fn get_pause_icon() -> Result<HICON, String> {
        if let Some(icon) = PAUSE_ICON.get() {
            return Ok(HICON(*icon as *mut c_void));
        }
        let icon = create_hicon_from_png(PAUSE_ICON_PNG)?;
        let _ = PAUSE_ICON.set(icon.0 as usize);
        Ok(HICON(
            *PAUSE_ICON.get().expect("pause icon should be initialized") as *mut c_void,
        ))
    }

    fn get_next_icon() -> Result<HICON, String> {
        if let Some(icon) = NEXT_ICON.get() {
            return Ok(HICON(*icon as *mut c_void));
        }
        let icon = create_hicon_from_png(NEXT_ICON_PNG)?;
        let _ = NEXT_ICON.set(icon.0 as usize);
        Ok(HICON(
            *NEXT_ICON.get().expect("next icon should be initialized") as *mut c_void,
        ))
    }

    fn make_buttons() -> Result<[THUMBBUTTON; 3], String> {
        let prev_icon = get_prev_icon()?;
        let next_icon = get_next_icon()?;
        let is_playing = IS_PLAYING.load(Ordering::Relaxed);
        let middle_icon = if is_playing { get_pause_icon()? } else { get_play_icon()? };
        let middle_tip = if is_playing { "一時停止" } else { "再生" };

        Ok([
            make_button(BTN_PREV, prev_icon, "前へ"),
            make_button(BTN_PLAY_PAUSE, middle_icon, middle_tip),
            make_button(BTN_NEXT, next_icon, "次へ"),
        ])
    }

    fn add_thumbnail_buttons(hwnd: HWND) -> Result<(), String> {
        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED)
                .ok()
                .map_err(|e| e.to_string())?;

            let taskbar: ITaskbarList3 =
                CoCreateInstance(&TaskbarList, None, CLSCTX_INPROC_SERVER)
                    .map_err(|e| e.to_string())?;
            taskbar.HrInit().map_err(|e| e.to_string())?;

            let buttons = make_buttons()?;

            taskbar
                .ThumbBarAddButtons(hwnd, &buttons)
                .map_err(|e| e.to_string())?;
            CoUninitialize();
        }

        Ok(())
    }

    unsafe extern "system" fn taskbar_subclass_proc(
        hwnd: HWND,
        umsg: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _uidsubclass: usize,
        _dwrefdata: usize,
    ) -> LRESULT {
        if let Some(created_msg) = TASKBAR_BUTTON_CREATED_MSG.get() {
            if umsg == *created_msg {
                let _ = add_thumbnail_buttons(hwnd);
            }
        }

        if umsg == WM_COMMAND {
            let raw = wparam.0;
            let code = ((raw >> 16) & 0xFFFF) as u32;
            let id = (raw & 0xFFFF) as u32;
            if code == THBN_CLICKED {
                if let Some(app) = APP_HANDLE.get() {
                    match id {
                        BTN_PREV => {
                            let _ = app.emit("tray-prev", ());
                        }
                        BTN_PLAY_PAUSE => {
                            let _ = app.emit("tray-play-pause", ());
                        }
                        BTN_NEXT => {
                            let _ = app.emit("tray-next", ());
                        }
                        _ => {}
                    }
                }
            }
        }

        unsafe { DefSubclassProc(hwnd, umsg, wparam, lparam) }
    }

    pub fn setup(app: &AppHandle) -> Result<(), String> {
        let _ = APP_HANDLE.set(app.clone());

        let window = app
            .get_webview_window("main")
            .ok_or_else(|| "main window not found".to_string())?;
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;

        unsafe {
            let taskbar_created_msg = RegisterWindowMessageW(w!("TaskbarButtonCreated"));
            let _ = TASKBAR_BUTTON_CREATED_MSG.set(taskbar_created_msg);
            let _ = SetWindowSubclass(hwnd, Some(taskbar_subclass_proc), SUBCLASS_ID, 0);
        }

        let _ = add_thumbnail_buttons(hwnd);
        Ok(())
    }

    pub fn set_playing(app: &AppHandle, is_playing: bool) -> Result<(), String> {
        IS_PLAYING.store(is_playing, Ordering::Relaxed);
        let window = app
            .get_webview_window("main")
            .ok_or_else(|| "main window not found".to_string())?;
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;

        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED)
                .ok()
                .map_err(|e| e.to_string())?;
            let taskbar: ITaskbarList3 =
                CoCreateInstance(&TaskbarList, None, CLSCTX_INPROC_SERVER)
                    .map_err(|e| e.to_string())?;
            taskbar.HrInit().map_err(|e| e.to_string())?;
            let buttons = make_buttons()?;
            taskbar
                .ThumbBarUpdateButtons(hwnd, &buttons)
                .map_err(|e| e.to_string())?;
            CoUninitialize();
        }

        Ok(())
    }
}

#[tauri::command]
fn set_taskbar_playing(app: AppHandle, is_playing: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return windows_taskbar::set_playing(&app, is_playing);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        let _ = is_playing;
        Ok(())
    }
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
async fn get_initial_args(state: State<'_, AppArgs>) -> Result<Vec<String>, String> {
    let mut args = state.args.lock().await;
    Ok(std::mem::take(&mut *args)) // Return and clear the args
}

#[tauri::command]
fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
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
            let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
            let current_exe_str = current_exe.to_string_lossy();

            // Run msiexec, wait for it to finish, and then relaunch the application
            let script = format!(
                "Start-Process msiexec.exe -ArgumentList '/i', '{}', '/passive' -Wait; Start-Process '{}'",
                path, current_exe_str
            );

            std::process::Command::new("powershell")
                .arg("-WindowStyle")
                .arg("Hidden")
                .arg("-Command")
                .arg(&script)
                .spawn()
                .map_err(|e: std::io::Error| e.to_string())?;
            return Ok(());
        }
    }

    // Open file with system default app when not handling MSI flow.
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppArgs {
            args: TokioMutex::new(std::env::args().skip(1).collect()), // Skip exe path
        })
        .manage(DiscordState {
            client: Arc::new(TokioMutex::new(None)),
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
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
            let state = app.state::<DiscordState>();
            let client_ptr = state.client.clone();
            
            println!("Initializing Discord client in setup...");
            let mut client = Client::new(1493885713463251014u64);
            
            client.on_ready(|_ctx| {
                println!("Discord RPC: Successfully connected!");
            });

            client.on_error(|err| {
                eprintln!("Discord RPC: Error occurred: {:?}", err);
            });

            client.start();
            println!("Discord client start() called.");
            match client_ptr.try_lock() {
                Ok(mut lock) => {
                    *lock = Some(client);
                    println!("Discord client instance stored in state.");
                },
                Err(_) => {
                    let client_ptr_async = client_ptr.clone();
                    tauri::async_runtime::spawn(async move {
                        let mut lock = client_ptr_async.lock().await;
                        *lock = Some(client);
                        println!("Discord client instance stored in state (async).");
                    });
                }
            }

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

            #[cfg(target_os = "windows")]
            {
                if let Err(e) = windows_taskbar::setup(&app.handle().clone()) {
                    eprintln!("Failed to setup Windows taskbar thumbnail controls: {}", e);
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
            read_binary_file,
            read_audio_file,
            get_file_metadata,
            save_text_file,
            read_text_file,
            get_initial_args,
            get_lyrics,
            get_version,
            set_taskbar_playing,
            fetch_latest_release_info,
            download_installer,
            run_installer,
            set_discord_presence,
            clear_discord_presence
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

