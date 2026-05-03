param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$edgeDir = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default"
$found = Test-Path $edgeDir

if ($CheckOnly) {
    if ($found) {
        $size = Get-FolderSize $edgeDir
        Write-JsonOutput @{ found = $true; browser = "edge"; size = $size }
    } else {
        Write-JsonOutput @{ found = $false; browser = "edge"; size = 0 }
    }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "Edge not found" }
    exit 1
}

$outDir = "$env:TEMP\pcmig_edge_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bookmarks = "$edgeDir\Bookmarks"
if (Test-Path $bookmarks) { Copy-Item $bookmarks "$outDir\Bookmarks.json" -Force }

$extDir = "$edgeDir\Extensions"
if (Test-Path $extDir) { Copy-Item $extDir "$outDir\Extensions" -Recurse -Force }

$history = "$edgeDir\History"
if (Test-Path $history) { Copy-Item $history "$outDir\History.sqlite" -Force }

$loginData = "$edgeDir\Login Data"
if (Test-Path $loginData) { Copy-Item $loginData "$outDir\LoginData.sqlite" -Force }

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
