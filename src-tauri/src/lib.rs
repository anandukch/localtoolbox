// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod python_bridge;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            python_bridge::run_python_tool,
            python_bridge::get_available_tools,
            python_bridge::check_python,
            python_bridge::check_moviepy,
            python_bridge::check_ffmpeg,
            python_bridge::check_pillow,
            python_bridge::check_pypdf2,
            python_bridge::check_psutil,
            python_bridge::check_pdf2image,
            python_bridge::install_moviepy,
            python_bridge::install_ffmpeg,
            python_bridge::install_pillow,
            python_bridge::install_pypdf2,
            python_bridge::install_psutil,
            python_bridge::install_pdf2image,
            python_bridge::open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
