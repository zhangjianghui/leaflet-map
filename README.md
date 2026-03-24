# leaflet-map

AutoHotkey v2 脚本：按系统配置加载鼠标手势（未定义系统回退 `Default`），并提供以下快捷键：

- `Ctrl+~`：隐藏指定程序（默认 `notepad.exe`）
- `Alt+~`：输出今天日期，格式 `yyyy-MM-dd`

## 文件

- `mouse_gesture.ahk`：主脚本
- `run_mouse_gesture_portable.bat`：便携启动脚本（要求与 `AutoHotkey64.exe` 同目录）

## 使用

### 方式 1：本机已安装 AutoHotkey v2

1. 安装 AutoHotkey v2。
2. 运行 `mouse_gesture.ahk`。
3. 按需修改脚本顶部配置：
   - `TargetHideExe`：需要被 `Ctrl+~` 隐藏的程序。
   - `GestureThreshold`：手势方向采样阈值。
   - `GestureProfiles`：不同系统的手势映射。

### 方式 2：便携模式（无需安装）

1. 将以下文件放在同一目录：
   - `mouse_gesture.ahk`
   - `run_mouse_gesture_portable.bat`
   - `AutoHotkey64.exe`
2. 双击运行 `run_mouse_gesture_portable.bat`。

## 手势说明

- 按住鼠标右键并移动触发手势。
- 方向由 `U / D / L / R` 组成，例如：
  - `L`：向左
  - `UD`：先上后下
- 脚本会自动根据系统版本选取配置：
  - `WIN_11` -> `WIN_11`
  - `WIN_10` -> `WIN_10`
  - 其他系统 -> `Default`
