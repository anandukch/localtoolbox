use serde_json::Value;
use std::env;
use std::io::Write;
use std::process::{Command, Stdio};
use std::fs;

/// Get embedded Python script content as fallback
fn get_embedded_script(tool: &str, script_name: &str) -> Option<&'static str> {
    match (tool, script_name) {
        ("video_add_audio", "addaudio") => Some(include_str!("../../tools/video_add_audio/addaudio.py")),
        ("image_compressor", "compress") => Some(include_str!("../../tools/image_compressor/compress.py")),
        _ => None,
    }
}

/// Execute a Python tool with JSON parameters
///
/// This function:
/// 1. Locates the Python script in tools/{tool_name}/{tool_name}.py
/// 2. Passes JSON parameters via stdin
/// 3. Captures JSON output from stdout
/// 4. Returns the result or error message
#[tauri::command]
pub async fn run_python_tool(tool: String, params: Value) -> Result<Value, String> {
    // Construct the path to the Python script
    // For video_add_audio -> tools/video_add_audio/addaudio.py
    let script_name = match tool.as_str() {
        "video_add_audio" => "addaudio",
        "image_compressor" => "compress",
        _ => &tool.replace("_", ""),
    };

    // Determine script path based on whether we're in development or packaged
    let script_path = if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // Check multiple possible locations for the tools
            let home_dir = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
            let possible_paths = vec![
                // Packaged location (next to executable)
                exe_dir.join("tools").join(&tool).join(format!("{}.py", script_name)),
                // User's local installation
                std::path::Path::new(&home_dir).join(".local").join("share").join("localtoolbox").join("tools").join(&tool).join(format!("{}.py", script_name)),
                // AppImage resource location
                exe_dir.join("usr").join("share").join("localtoolbox").join("tools").join(&tool).join(format!("{}.py", script_name)),
                // Alternative AppImage location
                exe_dir.join("share").join("localtoolbox").join("tools").join(&tool).join(format!("{}.py", script_name)),
                // System installation location
                std::path::PathBuf::from("/usr/share/localtoolbox/tools").join(&tool).join(format!("{}.py", script_name)),
            ];
            
            // Try each possible path
            let mut found_path = None;
            for path in possible_paths {
                if path.exists() {
                    found_path = Some(path.to_string_lossy().to_string());
                    break;
                }
            }
            
            if let Some(path) = found_path {
                path
            } else {
                // If none found, try development path (relative to executable)
                let dev_path = exe_dir.join("..").join("tools").join(&tool).join(format!("{}.py", script_name));
                if dev_path.exists() {
                    dev_path.to_string_lossy().to_string()
                } else {
                    // Last resort: install script to user's local directory
                    if let Some(script_content) = get_embedded_script(&tool, script_name) {
                        // Install to ~/.local/share/localtoolbox/tools/
                        let home_dir = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
                        let tools_dir = std::path::Path::new(&home_dir)
                            .join(".local")
                            .join("share")
                            .join("localtoolbox")
                            .join("tools")
                            .join(&tool);
                        
                        // Create directory if it doesn't exist
                        fs::create_dir_all(&tools_dir)
                            .map_err(|e| format!("Failed to create tools directory: {}", e))?;
                        
                        let script_path = tools_dir.join(format!("{}.py", script_name));
                        
                        // Only write if file doesn't exist (avoid overwriting)
                        if !script_path.exists() {
                            fs::write(&script_path, script_content)
                                .map_err(|e| format!("Failed to install script: {}", e))?;
                        }
                        
                        script_path.to_string_lossy().to_string()
                    } else {
                        return Err(format!("Python script not found. Tried multiple locations for {}/{}.py. Current exe: {:?}", tool, script_name, exe_path));
                    }
                }
            }
        } else {
            format!("../tools/{}/{}.py", tool, script_name)
        }
    } else {
        format!("../tools/{}/{}.py", tool, script_name)
    };

    // Convert parameters to JSON string
    let params_json = serde_json::to_string(&params)
        .map_err(|e| format!("Failed to serialize parameters: {}", e))?;

    // Use system Python to avoid bundled Python issues
    let python_cmd = "/usr/bin/python3";

    // Set environment variables to ensure system Python is used
    let mut cmd = Command::new(python_cmd);
    
    // Set working directory to user's home to avoid read-only filesystem issues
    let home_dir = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    
    cmd.arg(&script_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .current_dir(&home_dir)  // Set working directory to writable location
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .env("PYTHONUNBUFFERED", "1")
        .env("TMPDIR", &home_dir)  // Set temp directory for MoviePy
        .env("TEMP", &home_dir)    // Alternative temp directory variable
        .env("TMP", &home_dir);    // Another temp directory variable

    // Execute the Python script
    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start Python process: {}", e))?;

    // Send JSON parameters to stdin
    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(params_json.as_bytes())
            .map_err(|e| format!("Failed to write to Python stdin: {}", e))?;
    }

    // Wait for the process to complete and capture output
    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to read Python output: {}", e))?;

    // Check if the process succeeded
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "Python script failed:\nSTDERR: {}\nSTDOUT: {}",
            stderr, stdout
        ));
    }

    // Parse the JSON output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: Value = serde_json::from_str(&stdout).map_err(|e| {
        format!(
            "Failed to parse Python output as JSON: {} | Output: {}",
            e, stdout
        )
    })?;

    Ok(result)
}

/// Check if Python 3 is available
#[tauri::command]
pub async fn check_python() -> Result<serde_json::Value, String> {
    let output = Command::new("/usr/bin/python3")
        .arg("--version")
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            Ok(serde_json::json!({"success": true}))
        }
        _ => Ok(serde_json::json!({"success": false}))
    }
}

/// Check if MoviePy is installed
#[tauri::command]
pub async fn check_moviepy() -> Result<serde_json::Value, String> {
    let output = Command::new("/usr/bin/python3")
        .arg("-c")
        .arg("import moviepy")
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            Ok(serde_json::json!({"success": true}))
        }
        _ => Ok(serde_json::json!({"success": false}))
    }
}

/// Check if FFmpeg is available
#[tauri::command]
pub async fn check_ffmpeg() -> Result<serde_json::Value, String> {
    let output = Command::new("ffmpeg")
        .arg("-version")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            Ok(serde_json::json!({"success": true}))
        }
        _ => Ok(serde_json::json!({"success": false}))
    }
}

/// Check if Pillow (PIL) is installed
#[tauri::command]
pub async fn check_pillow() -> Result<serde_json::Value, String> {
    let output = Command::new("/usr/bin/python3")
        .arg("-c")
        .arg("import PIL")
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            Ok(serde_json::json!({"success": true}))
        }
        _ => Ok(serde_json::json!({"success": false}))
    }
}

/// Install MoviePy using pip
#[tauri::command]
pub async fn install_moviepy() -> Result<serde_json::Value, String> {
    // Try user installation first with clean environment
    let output = Command::new("/usr/bin/python3")
        .arg("-m")
        .arg("pip")
        .arg("install")
        .arg("moviepy")
        .arg("--user")
        .arg("--break-system-packages")
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .env("PYTHONUNBUFFERED", "1")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            Ok(serde_json::json!({
                "success": true,
                "message": "MoviePy installed successfully"
            }))
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Try without --break-system-packages
            let fallback_output = Command::new("/usr/bin/python3")
                .arg("-m")
                .arg("pip")
                .arg("install")
                .arg("moviepy")
                .arg("--user")
                .env_remove("PYTHONHOME")
                .env_remove("PYTHONPATH")
                .env("PYTHONUNBUFFERED", "1")
                .output();
            
            match fallback_output {
                Ok(fallback_output) if fallback_output.status.success() => {
                    Ok(serde_json::json!({
                        "success": true,
                        "message": "MoviePy installed successfully"
                    }))
                }
                _ => {
                    Ok(serde_json::json!({
                        "success": false,
                        "message": format!("Failed to install MoviePy: {}", stderr)
                    }))
                }
            }
        }
        Err(e) => {
            Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to run pip: {}", e)
            }))
        }
    }
}

/// Install Pillow using pip
#[tauri::command]
pub async fn install_pillow() -> Result<serde_json::Value, String> {
    // Try user installation first with clean environment
    let output = Command::new("/usr/bin/python3")
        .arg("-m")
        .arg("pip")
        .arg("install")
        .arg("Pillow")
        .arg("--user")
        .arg("--break-system-packages")
        .env_remove("PYTHONHOME")
        .env_remove("PYTHONPATH")
        .env("PYTHONUNBUFFERED", "1")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            Ok(serde_json::json!({
                "success": true,
                "message": "Pillow installed successfully"
            }))
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Try without --break-system-packages
            let fallback_output = Command::new("/usr/bin/python3")
                .arg("-m")
                .arg("pip")
                .arg("install")
                .arg("Pillow")
                .arg("--user")
                .env_remove("PYTHONHOME")
                .env_remove("PYTHONPATH")
                .env("PYTHONUNBUFFERED", "1")
                .output();
            
            match fallback_output {
                Ok(fallback_output) if fallback_output.status.success() => {
                    Ok(serde_json::json!({
                        "success": true,
                        "message": "Pillow installed successfully"
                    }))
                }
                _ => {
                    Ok(serde_json::json!({
                        "success": false,
                        "message": format!("Failed to install Pillow: {}", stderr)
                    }))
                }
            }
        }
        Err(e) => {
            Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to run pip: {}", e)
            }))
        }
    }
}

/// Install FFmpeg (requires sudo, might fail)
#[tauri::command]
pub async fn install_ffmpeg() -> Result<serde_json::Value, String> {
    // This will likely fail without sudo, but we can try
    let output = Command::new("pkexec")
        .arg("apt")
        .arg("install")
        .arg("-y")
        .arg("ffmpeg")
        .output();
    
    match output {
        Ok(output) if output.status.success() => {
            Ok(serde_json::json!({
                "success": true,
                "message": "FFmpeg installed successfully"
            }))
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to install FFmpeg (may require manual installation): {}", stderr)
            }))
        }
        Err(e) => {
            Ok(serde_json::json!({
                "success": false,
                "message": format!("Failed to install FFmpeg: {}", e)
            }))
        }
    }
}

/// Get the list of available tools
///
/// Scans the tools directory and returns a list of available tool names
#[tauri::command]
pub async fn get_available_tools() -> Result<Vec<String>, String> {
    let tools_dir = std::path::Path::new("tools");

    if !tools_dir.exists() {
        return Ok(vec![]);
    }

    let mut tools = Vec::new();

    let entries = std::fs::read_dir(tools_dir)
        .map_err(|e| format!("Failed to read tools directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            if let Some(tool_name) = path.file_name().and_then(|n| n.to_str()) {
                tools.push(tool_name.to_string());
            }
        }
    }

    Ok(tools)
}
