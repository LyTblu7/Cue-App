// Prevents additional console window on Windows in release, do not remove!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, PhysicalSize,
};
#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;

use std::sync::OnceLock;
use std::sync::Mutex;
use std::time::Instant;

static LAST_SHOWN: OnceLock<Mutex<Instant>> = OnceLock::new();

fn get_last_shown() -> &'static Mutex<Instant> {
    LAST_SHOWN.get_or_init(|| Mutex::new(Instant::now()))
}

static LAST_HIDDEN: OnceLock<Mutex<Instant>> = OnceLock::new();

fn get_last_hidden() -> &'static Mutex<Instant> {
    LAST_HIDDEN.get_or_init(|| Mutex::new(Instant::now() - std::time::Duration::from_secs(1)))
}

static IS_PINNED: OnceLock<Mutex<bool>> = OnceLock::new();

fn get_is_pinned() -> &'static Mutex<bool> {
    IS_PINNED.get_or_init(|| Mutex::new(false))
}

// Функция для позиционирования окна над системным треем
fn position_window_above_tray(window: &tauri::WebviewWindow) {
    if let Ok(Some(monitor)) = window.primary_monitor() {
        let work_area = monitor.work_area();
        let window_size = window.outer_size().unwrap_or(PhysicalSize::new(320, 450));

        // Вычисляем позицию: правый нижний угол рабочей области
        let x = work_area.position.x + (work_area.size.width as i32) - (window_size.width as i32) - 12;
        let y = work_area.position.y + (work_area.size.height as i32) - (window_size.height as i32) - 12;

        let _ = window.set_position(tauri::Position::Physical(PhysicalPosition::new(
            x as i32, y as i32,
        )));
    }
}

#[cfg(target_os = "windows")]
fn round_window_corners(window: &tauri::WebviewWindow) {
    use std::ffi::c_void;
    
    const DWMWA_WINDOW_CORNER_PREFERENCE: u32 = 33;
    const DWMWCP_ROUND: u32 = 2; // 2 = Round corners

    if let Ok(hwnd) = window.hwnd() {
        let hwnd_ptr = hwnd.0 as *mut c_void;

        #[link(name = "dwmapi")]
        extern "system" {
            fn DwmSetWindowAttribute(
                hwnd: *mut c_void,
                dwAttribute: u32,
                pvAttribute: *const c_void,
                cbAttribute: u32,
            ) -> i32;
        }

        unsafe {
            let preference = DWMWCP_ROUND;
            let _ = DwmSetWindowAttribute(
                hwnd_ptr,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &preference as *const u32 as *const c_void,
                std::mem::size_of::<u32>() as u32,
            );
        }
    }
}

fn update_tray_icon_to_system_theme(app: &tauri::AppHandle, window: &tauri::WebviewWindow) {
    if let Some(tray) = app.tray_by_id("main") {
        let system_theme = window.theme().unwrap_or(tauri::Theme::Dark);
        let icon_bytes = match system_theme {
            tauri::Theme::Dark => include_bytes!("../../src/logo-dark.png").as_ref(),
            _ => include_bytes!("../../src/logo-light.png").as_ref(),
        };
        if let Ok(img) = tauri::image::Image::from_bytes(icon_bytes) {
            let _ = tray.set_icon(Some(img));
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // Применяем эффект размытия Mica на Windows и закругляем нативно края
            #[cfg(target_os = "windows")]
            {
                let _ = window.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
                let _ = apply_mica(&window, None);
                round_window_corners(&window);
            }

            // Создаем menu для трея
            let restart_i = MenuItem::with_id(app, "restart", "Перезапустить", true, None::<&str>).unwrap();
            let quit_i = MenuItem::with_id(app, "quit", "Выйти", true, None::<&str>).unwrap();
            let menu = Menu::with_items(app, &[&restart_i, &quit_i]).unwrap();

            let system_theme = window.theme().unwrap_or(tauri::Theme::Dark);
            let initial_icon_bytes = match system_theme {
                tauri::Theme::Dark => include_bytes!("../../src/logo-dark.png").as_ref(),
                _ => include_bytes!("../../src/logo-light.png").as_ref(),
            };
            let initial_icon = tauri::image::Image::from_bytes(initial_icon_bytes).unwrap();

            // Инициализируем системный трей
            let _tray = TrayIconBuilder::with_id("main")
                .icon(initial_icon)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "restart" => {
                        if let Ok(current_exe) = std::env::current_exe() {
                            let _ = std::process::Command::new(current_exe).spawn();
                        }
                        app.exit(0);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, button_state, .. } = event {
                        if button == tauri::tray::MouseButton::Left && button_state == tauri::tray::MouseButtonState::Up {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let visible = window.is_visible().unwrap_or(false);
                                
                                let time_since_hide = if let Ok(last_hidden) = get_last_hidden().lock() {
                                    last_hidden.elapsed().as_millis()
                                } else {
                                    1000
                                };

                                if visible {
                                    let is_pinned = if let Ok(pinned) = get_is_pinned().lock() {
                                        *pinned
                                    } else {
                                        false
                                    };

                                    if is_pinned {
                                        if let Ok(mut pinned) = get_is_pinned().lock() {
                                            *pinned = false;
                                        }
                                        let _ = window.set_always_on_top(false);
                                        let _ = window.set_size(tauri::Size::Physical(PhysicalSize::new(320, 450)));
                                        position_window_above_tray(&window);
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                        let _ = window.emit("restore-dashboard", ());
                                    } else {
                                        let _ = window.hide();
                                        if let Ok(mut last_hidden) = get_last_hidden().lock() {
                                            *last_hidden = Instant::now();
                                        }
                                    }
                                } else {
                                    if time_since_hide > 150 {
                                        if let Ok(mut last_shown) = get_last_shown().lock() {
                                            *last_shown = Instant::now();
                                        }
                                        position_window_above_tray(&window);
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                        let _ = window.emit("show-requested", ());
                                    }
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            let window_for_tray = window.clone();
            let app_for_tray = app.handle().clone();
            update_tray_icon_to_system_theme(&app_for_tray, &window_for_tray);

            // Скрываем окно при потере фокуса (кликнули мимо окна)
            let window_clone = window.clone();
            let app_clone = app.handle().clone();
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::Focused(focused) => {
                        let focused = *focused;
                        if !focused {
                            let is_pinned = if let Ok(pinned) = get_is_pinned().lock() {
                                *pinned
                            } else {
                                false
                            };

                            let is_dragging = if let Ok(mut dragging) = get_is_dragging().lock() {
                                let val = *dragging;
                                *dragging = false;
                                val
                            } else {
                                false
                            };

                            // Проверяем, находится ли курсор мыши внутри окна в момент потери фокуса.
                            // Если да (например, при вызове ножниц/скриншотера Win+Shift+S), не скрываем окно.
                            let is_cursor_inside = is_cursor_inside_window(&window_clone);

                            if !is_pinned && !is_dragging && !is_cursor_inside && window_clone.is_visible().unwrap_or(false) {
                                let elapsed = if let Ok(last_shown) = get_last_shown().lock() {
                                    last_shown.elapsed().as_millis()
                                } else {
                                    1000
                                };
                                if elapsed > 500 {
                                    if let Ok(mut last_hidden) = get_last_hidden().lock() {
                                        *last_hidden = Instant::now();
                                    }
                                    let _ = window_clone.hide();
                                }
                            }
                        }
                    }
                    tauri::WindowEvent::ThemeChanged(_) => {
                        update_tray_icon_to_system_theme(&app_clone, &window_clone);
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window,
            update_tray_tooltip,
            toggle_pin,
            set_window_size,
            start_drag,
            change_theme,
            reposition_to_tray
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn reposition_to_tray(window: tauri::WebviewWindow) {
    position_window_above_tray(&window);
}

#[cfg(target_os = "windows")]
fn is_cursor_inside_window(window: &tauri::WebviewWindow) -> bool {
    #[repr(C)]
    struct POINT {
        x: i32,
        y: i32,
    }
    #[link(name = "user32")]
    extern "system" {
        fn GetCursorPos(lpPoint: *mut POINT) -> i32;
    }
    let mut pt = POINT { x: 0, y: 0 };
    if unsafe { GetCursorPos(&mut pt) } != 0 {
        if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
            pt.x >= pos.x && pt.x <= pos.x + (size.width as i32) &&
            pt.y >= pos.y && pt.y <= pos.y + (size.height as i32)
        } else {
            false
        }
    } else {
        false
    }
}

#[cfg(not(target_os = "windows"))]
fn is_cursor_inside_window(_window: &tauri::WebviewWindow) -> bool {
    false
}

#[tauri::command]
fn change_theme(app: tauri::AppHandle, window: tauri::WebviewWindow, theme: String) {
    #[cfg(target_os = "windows")]
    {
        let is_dark = match theme.as_str() {
            "dark" => Some(true),
            "light" => Some(false),
            _ => None,
        };
        let _ = apply_mica(&window, is_dark);

        // Update tray icon to system theme, not application theme
        update_tray_icon_to_system_theme(&app, &window);
    }
}

#[tauri::command]
fn hide_window(window: tauri::WebviewWindow) {
    let _ = window.hide();
}

#[tauri::command]
fn update_tray_tooltip(app: tauri::AppHandle, tooltip: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

#[tauri::command]
fn toggle_pin(window: tauri::WebviewWindow, pinned: bool) {
    let _ = window.set_always_on_top(pinned);
    if let Ok(mut is_pinned) = get_is_pinned().lock() {
        *is_pinned = pinned;
    }
}

#[tauri::command]
fn set_window_size(window: tauri::WebviewWindow, width: u32, height: u32) {
    let _ = window.set_size(tauri::Size::Physical(PhysicalSize::new(width, height)));
}

static IS_DRAGGING: OnceLock<Mutex<bool>> = OnceLock::new();

fn get_is_dragging() -> &'static Mutex<bool> {
    IS_DRAGGING.get_or_init(|| Mutex::new(false))
}

#[tauri::command]
fn start_drag(window: tauri::WebviewWindow) {
    if let Ok(mut dragging) = get_is_dragging().lock() {
        *dragging = true;
    }
    let _ = window.start_dragging();
}
