param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"
$templatesDir = "$env:APPDATA\Microsoft\Templates"
$officeDir = "$env:APPDATA\Microsoft\Office"
$found = (Test-Path $templatesDir) -or (Test-Path $officeDir)

if ($CheckOnly) {
    $size = 0
    if (Test-Path $templatesDir) { $size += Get-FolderSize $templatesDir }
    if (Test-Path $officeDir) { $size += Get-FolderSize $officeDir }
    Write-JsonOutput @{ found = $found; app = "office"; size = $size }
    exit 0
}

$outDir = "$env:TEMP\pcmig_office_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $templatesDir) { Copy-Item $templatesDir "$outDir\Templates" -Recurse -Force }
if (Test-Path $officeDir) { Copy-Item $officeDir "$outDir\Office" -Recurse -Force }
Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
