use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize, Serialize)]
struct DeepSeekConfig {
    api_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DeepSeekKeyStatus {
    configured: bool,
    source: String,
    masked_key: Option<String>,
}

fn load_deepseek_env() {
    if dotenvy::from_path("../.env").is_err() {
        let _ = dotenvy::dotenv();
    }
}

fn deepseek_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("config-error: Unable to locate app config directory: {error}"))?;

    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("config-error: Unable to create app config directory: {error}"))?;

    Ok(config_dir.join("deepseek.json"))
}

fn read_saved_deepseek_key(app: &AppHandle) -> Result<Option<String>, String> {
    let path = deepseek_config_path(app)?;
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)
        .map_err(|error| format!("config-error: Unable to read DeepSeek config: {error}"))?;
    let config: DeepSeekConfig = serde_json::from_str(&content)
        .map_err(|error| format!("config-error: Unable to parse DeepSeek config: {error}"))?;
    let api_key = config.api_key.trim().to_string();

    Ok((!api_key.is_empty()).then_some(api_key))
}

fn masked_key(api_key: &str) -> String {
    let chars: Vec<char> = api_key.chars().collect();
    if chars.len() <= 10 {
        return "********".to_string();
    }

    let start: String = chars.iter().take(6).collect();
    let end: String = chars.iter().rev().take(4).collect::<Vec<_>>().into_iter().rev().collect();
    format!("{start}...{end}")
}

fn resolve_deepseek_api_key(app: &AppHandle) -> Result<(String, String), String> {
    if let Some(api_key) = read_saved_deepseek_key(app)? {
        return Ok((api_key, "saved".to_string()));
    }

    load_deepseek_env();
    let api_key = std::env::var("DEEPSEEK_API_KEY").map_err(|_| {
        "missing-api-key: DeepSeek API key is missing. Save one in Settings or set DEEPSEEK_API_KEY."
            .to_string()
    })?;

    Ok((api_key, "environment".to_string()))
}

#[tauri::command]
fn get_deepseek_api_key_status(app: AppHandle) -> Result<DeepSeekKeyStatus, String> {
    if let Some(api_key) = read_saved_deepseek_key(&app)? {
        return Ok(DeepSeekKeyStatus {
            configured: true,
            source: "saved".to_string(),
            masked_key: Some(masked_key(&api_key)),
        });
    }

    load_deepseek_env();
    if let Ok(api_key) = std::env::var("DEEPSEEK_API_KEY") {
        if !api_key.trim().is_empty() {
            return Ok(DeepSeekKeyStatus {
                configured: true,
                source: "environment".to_string(),
                masked_key: Some(masked_key(&api_key)),
            });
        }
    }

    Ok(DeepSeekKeyStatus {
        configured: false,
        source: "none".to_string(),
        masked_key: None,
    })
}

#[tauri::command]
fn save_deepseek_api_key(app: AppHandle, api_key: String) -> Result<DeepSeekKeyStatus, String> {
    let api_key = api_key.trim().to_string();
    if api_key.is_empty() {
        return Err("missing-api-key: API key cannot be empty.".to_string());
    }

    let path = deepseek_config_path(&app)?;
    let content = serde_json::to_string_pretty(&DeepSeekConfig {
        api_key: api_key.clone(),
    })
    .map_err(|error| format!("config-error: Unable to serialize DeepSeek config: {error}"))?;

    fs::write(path, content)
        .map_err(|error| format!("config-error: Unable to save DeepSeek config: {error}"))?;

    Ok(DeepSeekKeyStatus {
        configured: true,
        source: "saved".to_string(),
        masked_key: Some(masked_key(&api_key)),
    })
}

#[tauri::command]
fn clear_deepseek_api_key(app: AppHandle) -> Result<DeepSeekKeyStatus, String> {
    let path = deepseek_config_path(&app)?;
    if path.exists() {
        fs::remove_file(path)
            .map_err(|error| format!("config-error: Unable to clear DeepSeek config: {error}"))?;
    }

    get_deepseek_api_key_status(app)
}

#[tauri::command]
async fn test_deepseek_api_key(app: AppHandle, api_key: Option<String>) -> Result<DeepSeekKeyStatus, String> {
    let api_key = match api_key.map(|key| key.trim().to_string()).filter(|key| !key.is_empty()) {
        Some(api_key) => api_key,
        None => resolve_deepseek_api_key(&app)?.0,
    };
    let base_url =
        std::env::var("DEEPSEEK_BASE_URL").unwrap_or_else(|_| "https://api.deepseek.com".to_string());
    let endpoint = format!("{}/models", base_url.trim_end_matches('/'));

    let response = reqwest::Client::new()
        .get(endpoint)
        .bearer_auth(&api_key)
        .send()
        .await
        .map_err(|error| format!("request-failed: DeepSeek connection test failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "request-failed: DeepSeek connection test failed with HTTP {}.",
            response.status()
        ));
    }

    Ok(DeepSeekKeyStatus {
        configured: true,
        source: "saved".to_string(),
        masked_key: Some(masked_key(&api_key)),
    })
}

#[tauri::command]
async fn generate_deepseek_progression(
    app: AppHandle,
    input: String,
    system_prompt: String,
) -> Result<String, String> {
    let (api_key, _) = resolve_deepseek_api_key(&app)?;
    let base_url =
        std::env::var("DEEPSEEK_BASE_URL").unwrap_or_else(|_| "https://api.deepseek.com".to_string());
    let model = std::env::var("DEEPSEEK_MODEL").unwrap_or_else(|_| "deepseek-chat".to_string());
    let endpoint = format!("{}/chat/completions", base_url.trim_end_matches('/'));

    let response = reqwest::Client::new()
        .post(endpoint)
        .bearer_auth(api_key)
        .json(&json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": input,
                }
            ],
            "temperature": 0.3,
            "response_format": {
                "type": "json_object",
            },
        }))
        .send()
        .await
        .map_err(|error| format!("request-failed: DeepSeek request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "request-failed: DeepSeek request failed with HTTP {}.",
            response.status()
        ));
    }

    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("invalid-json: DeepSeek returned an invalid response: {error}"))?;

    payload
        .get("choices")
        .and_then(|choices| choices.get(0))
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
        .map(ToString::to_string)
        .ok_or_else(|| "invalid-json: DeepSeek returned an invalid response.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            clear_deepseek_api_key,
            generate_deepseek_progression,
            get_deepseek_api_key_status,
            save_deepseek_api_key,
            test_deepseek_api_key
        ])
        .run(tauri::generate_context!())
        .expect("error while running ChordFlow");
}
