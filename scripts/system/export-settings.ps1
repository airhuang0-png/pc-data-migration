param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$items = @()

try {
    $wpPath = (Get-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallPaper -ErrorAction Stop).WallPaper
    if ($wpPath) { $items += "wallpaper" }
} catch { }

$taskbandPath = "$env:APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
if (Test-Path $taskbandPath) { $items += "taskbar_pins" }

try {
    $null = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name Hidden -ErrorAction Stop).Hidden
    $items += "explorer_prefs"
} catch { }

try {
    $null = (Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name AppsUseLightTheme -ErrorAction Stop).AppsUseLightTheme
    $items += "theme"
} catch { }

try {
    $wifiProfiles = netsh wlan show profiles | Select-String "所有用户配置文件" | ForEach-Object { $_ -replace '.*:\s*', '' }
    if ($wifiProfiles) { $items += "wifi" }
} catch { }

try {
    $powerPlan = powercfg /GetActiveScheme
    if ($powerPlan) { $items += "power_plan" }
} catch { }

$totalItems = $items.Count

if ($CheckOnly) {
    Write-JsonOutput @{ found = ($totalItems -gt 0); size = ($totalItems * 1024); items = $items }
    exit 0
}

$outDir = "$env:TEMP\pcmig_settings_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$exportData = @{}

if ($items -contains "wallpaper") {
    $wpPath = (Get-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallPaper).WallPaper
    if (Test-Path $wpPath) {
        Copy-Item $wpPath "$outDir\wallpaper$([System.IO.Path]::GetExtension($wpPath))" -Force
        $exportData.wallpaper = [System.IO.Path]::GetFileName($wpPath)
    }
}

if ($items -contains "explorer_prefs") {
    $explorerKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
    $exportData.explorer = @{
        Hidden         = (Get-ItemProperty -Path $explorerKey -Name Hidden).Hidden
        HideFileExt    = (Get-ItemProperty -Path $explorerKey -Name HideFileExt).HideFileExt
        ShowSuperHidden = (Get-ItemProperty -Path $explorerKey -Name ShowSuperHidden).ShowSuperHidden
    }
}

if ($items -contains "theme") {
    $themeKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    $exportData.theme = @{
        AppsUseLightTheme    = (Get-ItemProperty -Path $themeKey -Name AppsUseLightTheme).AppsUseLightTheme
        SystemUsesLightTheme = (Get-ItemProperty -Path $themeKey -Name SystemUsesLightTheme -ErrorAction SilentlyContinue).SystemUsesLightTheme
    }
}

if ($items -contains "wifi") {
    netsh wlan export profile key=clear folder="$outDir\wifi" | Out-Null
    $exportData.wifi = $true
}

if ($items -contains "power_plan") {
    powercfg /GetActiveScheme | Out-File "$outDir\power_plan.txt" -Encoding UTF8
    $exportData.power_plan = $true
}

$exportData | ConvertTo-Json -Depth 5 | Out-File "$outDir\settings_data.json" -Encoding UTF8

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
