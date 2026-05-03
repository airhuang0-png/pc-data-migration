param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"
$sogouDir = "$env:LOCALAPPDATA\..\LocalLow\SogouPY.users"
$found = Test-Path $sogouDir

if ($CheckOnly) {
    $size = if ($found) { Get-FolderSize $sogouDir } else { 0 }
    Write-JsonOutput @{ found = $found; app = "ime_sogou"; size = $size }
    exit 0
}

$outDir = "$env:TEMP\pcmig_ime_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if ($found) { Copy-Item $sogouDir "$outDir\SogouPY" -Recurse -Force }
Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
