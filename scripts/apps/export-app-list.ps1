param([switch]$CheckOnly)

$apps = @()
$paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
)

foreach ($path in $paths) {
    if (Test-Path (Split-Path $path)) {
        $items = Get-ItemProperty $path -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -and $_.DisplayName -notlike "*Update*" -and $_.DisplayName -notlike "*Driver*" } |
            Select-Object DisplayName, DisplayVersion, Publisher
        $apps += $items
    }
}

$unique = $apps | Sort-Object DisplayName -Unique

if ($CheckOnly) {
    Write-Output (ConvertTo-Json -Compress @{ found = ($unique.Count -gt 0); count = $unique.Count })
    exit 0
}

Write-Output (ConvertTo-Json -Compress @{ apps = @($unique | ForEach-Object { @{ name = $_.DisplayName; version = $_.DisplayVersion; publisher = $_.Publisher } }) })
