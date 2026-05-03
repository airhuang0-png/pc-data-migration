param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDir
)

. "$PSScriptRoot/../common/utils.ps1"

$dataFile = "$SourceDir\settings_data.json"
if (-not (Test-Path $dataFile)) {
    Write-JsonOutput @{ success = $false; error = "settings_data.json not found" }
    exit 1
}

$data = Get-Content $dataFile -Encoding UTF8 | ConvertFrom-Json

if ($data.wallpaper) {
    $wpFile = Get-ChildItem "$SourceDir\wallpaper.*" | Select-Object -First 1
    if ($wpFile) {
        Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name WallPaper -Value $wpFile.FullName
    }
}

if ($data.explorer) {
    $explorerKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
    Set-ItemProperty -Path $explorerKey -Name Hidden -Value $data.explorer.Hidden
    Set-ItemProperty -Path $explorerKey -Name HideFileExt -Value $data.explorer.HideFileExt
    Set-ItemProperty -Path $explorerKey -Name ShowSuperHidden -Value $data.explorer.ShowSuperHidden
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Process explorer
}

if ($data.theme) {
    $themeKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
    Set-ItemProperty -Path $themeKey -Name AppsUseLightTheme -Value $data.theme.AppsUseLightTheme
    if ($data.theme.SystemUsesLightTheme -ne $null) {
        Set-ItemProperty -Path $themeKey -Name SystemUsesLightTheme -Value $data.theme.SystemUsesLightTheme
    }
}

if ($data.wifi) {
    Get-ChildItem "$SourceDir\wifi\*.xml" | ForEach-Object {
        netsh wlan add profile filename="$($_.FullName)" | Out-Null
    }
}

if ($data.power_plan) {
    Write-Output "Power plan info was exported. Manual reconfiguration may be needed."
}

Write-JsonOutput @{ success = $true; items_restored = ($data.PSObject.Properties | Measure-Object).Count }
