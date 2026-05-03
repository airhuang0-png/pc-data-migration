param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"

$chromeDir = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default"
$found = Test-Path $chromeDir

if ($CheckOnly) {
    if ($found) {
        $size = Get-FolderSize $chromeDir
        Write-JsonOutput @{ found = $true; browser = "chrome"; size = $size }
    } else {
        Write-JsonOutput @{ found = $false; browser = "chrome"; size = 0 }
    }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "Chrome not found" }
    exit 1
}

$outDir = "$env:TEMP\pcmig_chrome_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bookmarksPath = "$chromeDir\Bookmarks"
if (Test-Path $bookmarksPath) {
    Copy-Item $bookmarksPath "$outDir\Bookmarks.json" -Force
}

$extDir = "$chromeDir\Extensions"
if (Test-Path $extDir) {
    Copy-Item $extDir "$outDir\Extensions" -Recurse -Force
}

$historyPath = "$chromeDir\History"
if (Test-Path $historyPath) {
    Copy-Item $historyPath "$outDir\History.sqlite" -Force
}

$loginData = "$chromeDir\Login Data"
if (Test-Path $loginData) {
    Copy-Item $loginData "$outDir\LoginData.sqlite" -Force
}

$cookiesPath = "$chromeDir\Network\Cookies"
if (Test-Path $cookiesPath) {
    New-Item -ItemType Directory -Force -Path "$outDir\Network" | Out-Null
    Copy-Item $cookiesPath "$outDir\Network\Cookies" -Force
}

Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
