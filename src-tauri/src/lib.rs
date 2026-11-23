pub mod capture;
pub mod db;

use capture::{CaptureManager, PermissionStatus, RawNativeEvent};
use db::{Database, SessionSummary};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{
    AppHandle, Emitter, LogicalPosition, Manager, State, WebviewUrl, WebviewWindowBuilder,
};

pub struct AppState {
    pub capture: CaptureManager,
    pub db: Database,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSkillResult {
    pub target_path: String,
    pub agent_name: String,
}

pub fn sanitize_skill_slug(raw: &str) -> String {
    let mapped: String = raw
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();
    let collapsed = mapped
        .split('-')
        .filter(|seg| !seg.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    if collapsed.is_empty() {
        "stepcast-workflow".to_string()
    } else {
        collapsed
    }
}

pub fn write_skill_package_to_base(
    base_dir: &Path,
    agent_name: &str,
    skill_slug: &str,
    skill_markdown: &str,
    sop_markdown: &str,
) -> Result<ExportSkillResult, String> {
    let final_slug = sanitize_skill_slug(skill_slug);
    let skill_dir = base_dir.join(&final_slug);
    let refs_dir = skill_dir.join("references");
    std::fs::create_dir_all(&refs_dir).map_err(|e| format!("Failed to create skill dir: {}", e))?;

    let skill_file = skill_dir.join("SKILL.md");
    std::fs::write(&skill_file, skill_markdown)
        .map_err(|e| format!("Failed to write SKILL.md: {}", e))?;

    let sop_file = refs_dir.join("visual-sop.md");
    std::fs::write(&sop_file, sop_markdown)
        .map_err(|e| format!("Failed to write visual-sop.md: {}", e))?;

    Ok(ExportSkillResult {
        target_path: skill_file.to_string_lossy().to_string(),
        agent_name: agent_name.to_string(),
    })
}

fn show_floating_hud_and_minimize_main(app: &AppHandle) {
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.minimize();
    }

    if let Some(hud_win) = app.get_webview_window("hud") {
        let _ = hud_win.show();
        let _ = hud_win.set_focus();
        return;
    }

    if let Ok(hud) = WebviewWindowBuilder::new(
        app,
        "hud",
        WebviewUrl::App("index.html?window=hud".into()),
    )
    .title("StepCast Recorder HUD")
    .inner_size(340.0, 56.0)
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .position(48.0, 48.0)
    .build()
    {
        if let Ok(Some(monitor)) = hud.primary_monitor() {
            let scale = monitor.scale_factor();
            let logical_w = monitor.size().width as f64 / scale;
            let x = (logical_w - 368.0).max(24.0);
            let _ = hud.set_position(LogicalPosition::new(x, 36.0));
        }
    }
}

fn hide_floating_hud_and_restore_main(app: &AppHandle) {
    if let Some(hud_win) = app.get_webview_window("hud") {
        let _ = hud_win.hide();
    }
    if let Some(main_win) = app.get_webview_window("main") {
        let _ = main_win.unminimize();
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
}

#[tauri::command]
fn check_permissions(state: State<'_, AppState>) -> PermissionStatus {
    state.capture.check_permissions()
}

#[tauri::command]
fn request_permission(kind: String, state: State<'_, AppState>) -> PermissionStatus {
    state.capture.request_permission(&kind)
}

#[tauri::command]
fn start_recording(
    minimize_studio: Option<bool>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.capture.start_recording(app.clone())?;
    let _ = app.emit("stepcast://recording-state", true);
    if minimize_studio.unwrap_or(true) {
        show_floating_hud_and_minimize_main(&app);
    }
    Ok(())
}

#[tauri::command]
fn stop_recording(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state.capture.stop_recording()?;
    let _ = app.emit("stepcast://recording-state", false);
    hide_floating_hud_and_restore_main(&app);
    Ok(())
}

#[tauri::command]
fn is_recording(state: State<'_, AppState>) -> bool {
    state.capture.is_recording()
}

#[tauri::command]
fn capture_instant_snapshot(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RawNativeEvent, String> {
    let evt = state.capture.capture_instant_snapshot()?;
    let _ = app.emit("stepcast://step-captured", evt.clone());
    Ok(evt)
}

#[tauri::command]
fn list_sessions(state: State<'_, AppState>) -> Result<Vec<SessionSummary>, String> {
    state.db.list_sessions()
}

#[tauri::command]
fn load_session(id: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    state.db.load_session(&id)
}

#[tauri::command]
fn save_session(
    id: String,
    title: String,
    step_count: usize,
    payload_json: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.db.save_session(&id, &title, step_count, &payload_json)
}

#[tauri::command]
fn delete_session(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.delete_session(&id)
}

#[tauri::command]
fn install_skill_to_agent(
    agent_target: String,
    skill_slug: String,
    skill_markdown: String,
    sop_markdown: String,
) -> Result<ExportSkillResult, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Cannot determine user home directory".to_string())?;
    let home_path = PathBuf::from(home);

    let (base_dir, agent_name) = match agent_target.as_str() {
        "claude" => (home_path.join(".claude").join("skills"), "Claude Code"),
        "codex" => (home_path.join(".codex").join("skills"), "OpenAI Codex"),
        "cursor" => (home_path.join(".cursor").join("skills"), "Cursor"),
        _ => (home_path.join(".agents").join("skills"), "Universal Agents"),
    };

    write_skill_package_to_base(
        &base_dir,
        agent_name,
        &skill_slug,
        &skill_markdown,
        &sop_markdown,
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("stepcast"));
            let resource_dir = app.path().resource_dir().ok();
            let capture = CaptureManager::new(app_data_dir.clone(), resource_dir);
            let db = Database::new(app_data_dir)
                .expect("Failed to initialize StepCast local SQLite database");
            app.manage(AppState { capture, db });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_permissions,
            request_permission,
            start_recording,
            stop_recording,
            is_recording,
            capture_instant_snapshot,
            list_sessions,
            load_session,
            save_session,
            delete_session,
            install_skill_to_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running StepCast application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_skill_slugs_cleanly() {
        assert_eq!(sanitize_skill_slug("Configure GitHub MCP!!"), "configure-github-mcp");
        assert_eq!(sanitize_skill_slug("中文名称---"), "stepcast-workflow");
        assert_eq!(sanitize_skill_slug("deploy_prod-v2"), "deploy_prod-v2");
    }

    #[test]
    fn writes_skill_package_structure_to_temp_dir() {
        let temp = std::env::temp_dir().join(format!("stepcast-test-{}", uuid::Uuid::new_v4()));
        let res = write_skill_package_to_base(
            &temp,
            "Claude Code",
            "My Release Skill",
            "---\nname: my-release-skill\n---\n# Skill",
            "# Visual SOP",
        )
        .expect("should write skill package");
        assert!(res.target_path.ends_with("my-release-skill/SKILL.md") || res.target_path.ends_with("my-release-skill\\SKILL.md"));
        let skill_content = std::fs::read_to_string(temp.join("my-release-skill").join("SKILL.md")).unwrap();
        let sop_content = std::fs::read_to_string(temp.join("my-release-skill").join("references").join("visual-sop.md")).unwrap();
        assert!(skill_content.contains("my-release-skill"));
        assert_eq!(sop_content, "# Visual SOP");
        let _ = std::fs::remove_dir_all(&temp);
    }
}
