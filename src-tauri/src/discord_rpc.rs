use std::sync::Arc;
use tokio::sync::Mutex;
use discord_presence::Client;
use tauri::State;

pub struct DiscordState {
    pub client: Arc<Mutex<Option<Client>>>,
}

#[tauri::command]
pub async fn set_discord_presence(
    state: State<'_, DiscordState>,
    details: String,
    presence_state: String,
    start_timestamp: Option<u64>,
    end_timestamp: Option<u64>,
    is_playing: bool,
) -> std::result::Result<(), String> {
    println!("set_discord_presence called: details={}, state={}, is_playing={}", details, presence_state, is_playing);
    let mut client_lock = state.client.lock().await;
    
    if let Some(ref mut client) = *client_lock {
        println!("Updating Discord activity...");
        
        // Discord has a minimum length of 2 and maximum of 128 for details and state
        let mut d = details.clone();
        if d.len() < 2 { d.push_str("  "); }
        if d.len() > 128 { d = d.chars().take(125).collect::<String>() + "..."; }

        let mut s = presence_state.clone();
        if s.len() < 2 { s.push_str("  "); }
        if s.len() > 128 { s = s.chars().take(125).collect::<String>() + "..."; }

        println!("Processed strings: details='{}', state='{}'", d, s);

        // Perform the activity update inside the lock but keep it as brief as possible
        let res = client.set_activity(|a| {
            let mut a = a.details(d)
                .state(s);
            
            if start_timestamp.is_some() || end_timestamp.is_some() {
                a = a.timestamps(|t| {
                    let mut t = t;
                    if let Some(s) = start_timestamp { t = t.start(s); }
                    if let Some(e) = end_timestamp { t = t.end(e); }
                    t
                });
            }
            a
        });

        drop(client_lock); // Release lock as soon as possible

        if let Err(e) = res {
            eprintln!("Discord RPC Error: {:?}", e);
            // Don't return error to frontend to prevent UI blocking
        } else {
            println!("Discord activity update packet sent.");
        }
    } else {
        println!("Discord client is not initialized.");
    }

    Ok(())
}

#[tauri::command]
pub async fn clear_discord_presence(state: State<'_, DiscordState>) -> std::result::Result<(), String> {
    println!("clear_discord_presence called");
    let mut client_lock = state.client.lock().await;
    if let Some(ref mut client) = *client_lock {
        let res = client.clear_activity();
        if let Err(e) = res {
            println!("Error clearing Discord activity: {:?}", e);
            return Err(e.to_string());
        }
        println!("Discord activity cleared.");
    }
    Ok(())
}
