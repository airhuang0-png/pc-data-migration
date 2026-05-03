function Write-JsonOutput($obj) {
    $obj | ConvertTo-Json -Depth 10 -Compress | Write-Output
}

function Resolve-PathVar($pathWithVars) {
    return [Environment]::ExpandEnvironmentVariables($pathWithVars)
}

function Get-FolderSize($folderPath) {
    if (-not (Test-Path $folderPath)) { return 0 }
    $size = 0
    Get-ChildItem -Path $folderPath -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
        $size += $_.Length
    }
    return $size
}

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-SystemInfo {
    $os = Get-CimInstance Win32_OperatingSystem
    return @{
        hostname   = $env:COMPUTERNAME
        os         = "Windows $($os.Caption -replace 'Microsoft Windows ', '')"
        os_version = $os.Version
        arch       = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
        username   = $env:USERNAME
    }
}
