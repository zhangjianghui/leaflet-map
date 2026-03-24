#Requires AutoHotkey v2.0
#SingleInstance Force

; ======================
; 可配置项
; ======================
TargetHideExe := "notepad.exe" ; Ctrl+~ 时隐藏的目标程序（可改）
GestureThreshold := 30           ; 鼠标移动超过该像素才记一次方向

; 方向字符：U D L R
; 手势由方向拼接，比如 "L"、"DR"、"URD"
;
; 系统手势配置：按系统覆盖默认配置。
; 未定义系统时，自动使用 Default。
GestureProfiles := Map(
    "Default", Map(
        "L", (*) => Send("!{Left}"),                  ; 后退
        "R", (*) => Send("!{Right}"),                 ; 前进
        "U", (*) => Send("^{PgUp}"),                  ; 上一个标签页
        "D", (*) => Send("^{PgDn}"),                  ; 下一个标签页
        "UD", (*) => Send("^{w}"),                    ; 关闭标签页
        "DU", (*) => Send("^{+t}")                    ; 重新打开关闭的标签页
    ),
    "WIN_11", Map(
        "L", (*) => Send("!{Left}"),
        "R", (*) => Send("!{Right}"),
        "U", (*) => Send("#{Tab}"),                  ; 任务视图
        "D", (*) => Send("#d"),                      ; 显示桌面
        "UD", (*) => Run("ms-settings:"),            ; 打开设置
        "DR", (*) => Send("#{Right}")                ; 窗口移到右侧虚拟桌面
    ),
    "WIN_10", Map(
        "L", (*) => Send("!{Left}"),
        "R", (*) => Send("!{Right}"),
        "U", (*) => Send("#{Tab}"),
        "D", (*) => Send("#m"),                      ; 最小化所有窗口
        "UD", (*) => Run("control"),                 ; 打开控制面板
        "DR", (*) => Send("#{Right}")
    )
)

; ======================
; 系统识别与配置选择
; ======================
GetSystemProfileName() {
    os := A_OSVersion

    ; A_OSVersion 常见值：WIN_10 / WIN_11 等
    if (InStr(os, "WIN_11"))
        return "WIN_11"
    if (InStr(os, "WIN_10"))
        return "WIN_10"

    return "Default"
}

GetActiveGestures() {
    global GestureProfiles

    profileName := GetSystemProfileName()
    if GestureProfiles.Has(profileName)
        return GestureProfiles[profileName]

    return GestureProfiles["Default"]
}

; ======================
; 手势识别状态
; ======================
GesturePath := ""
LastX := 0
LastY := 0

~RButton:: {
    global LastX, LastY, GesturePath
    GesturePath := ""
    MouseGetPos &LastX, &LastY
}

~RButton Up:: {
    global GesturePath
    gestures := GetActiveGestures()

    if (GesturePath != "" && gestures.Has(GesturePath)) {
        gestures[GesturePath].Call()
    }

    GesturePath := ""
}

#HotIf GetKeyState("RButton", "P")
~MouseMove:: {
    global LastX, LastY, GesturePath, GestureThreshold

    MouseGetPos &x, &y
    dx := x - LastX
    dy := y - LastY

    if (Abs(dx) < GestureThreshold && Abs(dy) < GestureThreshold)
        return

    dir := ""
    if (Abs(dx) > Abs(dy))
        dir := (dx > 0) ? "R" : "L"
    else
        dir := (dy > 0) ? "D" : "U"

    ; 连续相同方向不重复记录
    if (SubStr(GesturePath, -1) != dir)
        GesturePath .= dir

    LastX := x
    LastY := y
}
#HotIf

; ======================
; 额外快捷键
; ======================
^`:: {
    global TargetHideExe

    hwnd := WinExist("ahk_exe " TargetHideExe)
    if (!hwnd) {
        ToolTip "未找到程序: " TargetHideExe
        SetTimer () => ToolTip(), -1200
        return
    }

    WinHide "ahk_id " hwnd
    ToolTip "已隐藏: " TargetHideExe
    SetTimer () => ToolTip(), -1200
}

!`:: {
    today := FormatTime(, "yyyy-MM-dd")
    SendText(today)
}
