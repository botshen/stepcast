use base64::Engine;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionStatus {
    pub accessibility: bool,
    pub screen_recording: bool,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoRedactionRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawNativeEvent {
    pub id: String,
    pub timestamp_ms: i64,
    pub app_name: String,
    pub bundle_id: String,
    pub window_title: String,
    pub button: String,
    #[serde(default)]
    pub shortcut_key: String,
    pub norm_x: f64,
    pub norm_y: f64,
    pub screen_width: u32,
    pub screen_height: u32,
    pub scale_factor: f64,
    pub element_role: String,
    pub element_label: String,
    pub ocr_text: String,
    pub detection_source: String,
    pub image_path: String,
    #[serde(default)]
    pub auto_redactions: Vec<AutoRedactionRect>,
    #[serde(default)]
    pub image_data_url: Option<String>,
}

impl RawNativeEvent {
    pub fn hydrate_image_data_url(&mut self) {
        if !self.image_path.is_empty() {
            if let Ok(bytes) = std::fs::read(&self.image_path) {
                let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
                self.image_data_url = Some(format!("data:image/png;base64,{}", encoded));
            }
        }
    }
}

pub struct CaptureManager {
    active_child: Arc<Mutex<Option<Child>>>,
    captures_dir: PathBuf,
    resource_dir: Option<PathBuf>,
}

impl CaptureManager {
    pub fn new(app_data_dir: PathBuf, resource_dir: Option<PathBuf>) -> Self {
        let captures_dir = app_data_dir.join("captures");
        let _ = std::fs::create_dir_all(&captures_dir);
        Self {
            active_child: Arc::new(Mutex::new(None)),
            captures_dir,
            resource_dir,
        }
    }

    #[cfg(target_os = "macos")]
    fn darwin_helper_path(&self) -> PathBuf {
        if let Some(res) = &self.resource_dir {
            let bundled = res.join("native").join("stepcast-darwin-capture");
            if bundled.exists() {
                return bundled;
            }
        }
        let dev_native = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("native")
            .join("stepcast-darwin-capture");
        if dev_native.exists() {
            return dev_native;
        }
        let dev_bin = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join("stepcast-darwin-capture");
        if dev_bin.exists() {
            return dev_bin;
        }
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                let sibling = dir.join("../Resources/native/stepcast-darwin-capture");
                if sibling.exists() {
                    return sibling;
                }
            }
        }
        dev_native
    }

    #[cfg(target_os = "windows")]
    fn windows_script_path(&self) -> PathBuf {
        if let Some(res) = &self.resource_dir {
            let bundled = res.join("native").join("win_capture.ps1");
            if bundled.exists() {
                return bundled;
            }
        }
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("native")
            .join("win_capture.ps1")
    }

    pub fn check_permissions(&self) -> PermissionStatus {
        #[cfg(target_os = "macos")]
        {
            let helper = self.darwin_helper_path();
            if let Ok(out) = Command::new(helper).arg("check").output() {
                if let Ok(status) = serde_json::from_slice::<PermissionStatus>(&out.stdout) {
                    return status;
                }
            }
            PermissionStatus {
                accessibility: false,
                screen_recording: false,
                platform: "macos".into(),
            }
        }
        #[cfg(target_os = "windows")]
        {
            PermissionStatus {
                accessibility: true,
                screen_recording: true,
                platform: "windows".into(),
            }
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            PermissionStatus {
                accessibility: true,
                screen_recording: true,
                platform: std::env::consts::OS.into(),
            }
        }
    }

    pub fn request_permission(&self, kind: &str) -> PermissionStatus {
        #[cfg(target_os = "macos")]
        {
            let arg = if kind == "accessibility" {
                "request-ax"
            } else {
                "request-screen"
            };
            let helper = self.darwin_helper_path();
            if let Ok(out) = Command::new(helper).arg(arg).output() {
                if let Ok(status) = serde_json::from_slice::<PermissionStatus>(&out.stdout) {
                    return status;
                }
            }
        }
        let _ = kind;
        self.check_permissions()
    }

    pub fn capture_instant_snapshot(&self) -> Result<RawNativeEvent, String> {
        #[cfg(target_os = "macos")]
        {
            let helper = self.darwin_helper_path();
            let out = Command::new(helper)
                .args(["snapshot", self.captures_dir.to_str().unwrap_or("/tmp")])
                .output()
                .map_err(|e| format!("Failed to start macOS capture helper: {}", e))?;
            return Self::parse_snapshot_stdout(&out.stdout);
        }
        #[cfg(target_os = "windows")]
        {
            let script = self.windows_script_path();
            let out = Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    script.to_str().unwrap_or(""),
                    "-Mode",
                    "snapshot",
                    "-OutputDir",
                    self.captures_dir.to_str().unwrap_or("."),
                ])
                .output()
                .map_err(|e| format!("Failed to invoke Windows capture helper: {}", e))?;
            return Self::parse_snapshot_stdout(&out.stdout);
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            Err("Native snapshot requires macOS or Windows desktop runtime".into())
        }
    }

    fn parse_snapshot_stdout(stdout: &[u8]) -> Result<RawNativeEvent, String> {
        let line = String::from_utf8_lossy(stdout);
        let first = line
            .lines()
            .find(|l| !l.trim().is_empty())
            .ok_or_else(|| "No screen frame returned; please grant Screen Recording permission.".to_string())?;
        let mut evt: RawNativeEvent =
            serde_json::from_str(first).map_err(|e| format!("Invalid capture payload: {}", e))?;
        evt.hydrate_image_data_url();
        Ok(evt)
    }

    pub fn start_recording(&self, app: AppHandle) -> Result<(), String> {
        let mut guard = self.active_child.lock();
        if guard.is_some() {
            return Ok(());
        }

        let own_pid = std::process::id().to_string();

        #[cfg(target_os = "macos")]
        let mut child = {
            let helper = self.darwin_helper_path();
            Command::new(helper)
                .args([
                    "watch",
                    self.captures_dir.to_str().unwrap_or("/tmp"),
                    &own_pid,
                ])
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|e| format!("Failed to spawn macOS watcher: {}", e))?
        };

        #[cfg(target_os = "windows")]
        let mut child = {
            let script = self.windows_script_path();
            Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-File",
                    script.to_str().unwrap_or(""),
                    "-Mode",
                    "watch",
                    "-OutputDir",
                    self.captures_dir.to_str().unwrap_or("."),
                    "-SkipPid",
                    &own_pid,
                ])
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .spawn()
                .map_err(|e| format!("Failed to spawn Windows watcher: {}", e))?
        };

        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        return Err("Unsupported desktop OS for native recording".into());

        #[cfg(any(target_os = "macos", target_os = "windows"))]
        {
            if let Some(stdout) = child.stdout.take() {
                let app_clone = app.clone();
                std::thread::spawn(move || {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines().map_while(Result::ok) {
                        let trimmed = line.trim();
                        if trimmed.is_empty() {
                            continue;
                        }
                        if let Ok(mut evt) = serde_json::from_str::<RawNativeEvent>(trimmed) {
                            evt.hydrate_image_data_url();
                            let _ = app_clone.emit("stepcast://step-captured", evt);
                        }
                    }
                });
            }

            *guard = Some(child);
            Ok(())
        }
    }

    pub fn stop_recording(&self) -> Result<(), String> {
        let mut guard = self.active_child.lock();
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        self.active_child.lock().is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_native_event_with_auto_redactions_and_shortcuts() {
        let raw = r#"{
            "id": "step-001",
            "timestampMs": 1700000000000,
            "appName": "Ghostty",
            "bundleId": "com.mitchellh.ghostty",
            "windowTitle": "Deploy",
            "button": "shortcut",
            "shortcutKey": "⌘K",
            "normX": 0.42,
            "normY": 0.58,
            "screenWidth": 1920,
            "screenHeight": 1080,
            "scaleFactor": 2.0,
            "elementRole": "AXButton",
            "elementLabel": "Run",
            "ocrText": "",
            "detectionSource": "accessibility",
            "imagePath": "",
            "autoRedactions": [{"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.05, "label": "API Secret Key"}]
        }"#;
        let parsed: RawNativeEvent = serde_json::from_str(raw).expect("valid native JSON");
        assert_eq!(parsed.shortcut_key, "⌘K");
        assert_eq!(parsed.auto_redactions.len(), 1);
        assert_eq!(parsed.auto_redactions[0].label, "API Secret Key");
    }
}
