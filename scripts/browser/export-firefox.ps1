param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$ffProfilesDir = "$env:APPDATA\Mozilla\Firefox\Profiles"
$found = Test-Path $ffProfilesDir

if ($CheckOnly) {
    if ($found) {
        $size = Get-FolderSize $ffProfilesDir
        Write-JsonOutput @{ found = $true; browser = "firefox"; size = $size }
    } else {
        Write-JsonOutput @{ found = $false; browser = "firefox"; size = 0 }
    }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "Firefox not found" }
    exit 1
}

$outDir = "$env:TEMP\pcmig_firefox_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$profiles = Get-ChildItem -Path $ffProfilesDir -Directory | Where-Object { $_.Name -like "*.default*" } | Sort-Object LastWriteTime -Descending
if ($profiles.Count -gt 0) {
    Copy-Item $profiles[0].FullName "$outDir\profile" -Recurse -Force
}

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
