param(
    [Parameter(Mandatory=$true)]
    [string]$SourceDir,
    [string]$Browser = "chrome"
)

. "$PSScriptRoot/../common/utils.ps1"

switch ($Browser.ToLower()) {
    "chrome" { $targetDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default" }
    "edge"   { $targetDir = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default" }
    "firefox" {
        $profilesDir = "$env:APPDATA\Mozilla\Firefox\Profiles"
        $profiles = Get-ChildItem $profilesDir -Directory | Where-Object { $_.Name -like "*.default*" } | Sort-Object LastWriteTime -Descending
        if ($profiles.Count -gt 0) { $targetDir = $profiles[0].FullName }
        else { $targetDir = $profilesDir }
    }
    default {
        Write-JsonOutput @{ success = $false; error = "Unknown browser: $Browser" }
        exit 1
    }
}

if (-not (Test-Path $SourceDir)) {
    Write-JsonOutput @{ success = $false; error = "Source directory not found: $SourceDir" }
    exit 1
}

$browserProcesses = @{
    chrome  = "chrome"
    edge    = "msedge"
    firefox = "firefox"
}
$procName = $browserProcesses[$Browser.ToLower()]
if ($procName) {
    Get-Process -Name $procName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item "$SourceDir\*" $targetDir -Recurse -Force

Write-JsonOutput @{ success = $true; target = $targetDir }
