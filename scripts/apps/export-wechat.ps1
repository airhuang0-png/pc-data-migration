param([switch]$CheckOnly)

. "$PSScriptRoot/../common/utils.ps1"
$wechatDir = "$env:USERPROFILE\Documents\WeChat Files"
$found = Test-Path $wechatDir

if ($CheckOnly) {
    $size = if ($found) { Get-FolderSize $wechatDir } else { 0 }
    Write-JsonOutput @{ found = $found; app = "wechat"; size = $size }
    exit 0
}

if (-not $found) {
    Write-JsonOutput @{ success = $false; error = "WeChat files not found" }
    exit 1
}

$outDir = "$env:TEMP\pcmig_wechat_export"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Copy-Item $wechatDir "$outDir\WeChat Files" -Recurse -Force
Write-JsonOutput @{ success = $true; outputDir = $outDir; size = (Get-FolderSize $outDir) }
