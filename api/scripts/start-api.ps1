param([string]$Item = 'My API - Development')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$local = Join-Path $root '.local'
$previous = @{}
foreach ($name in @('BITWARDENCLI_APPDATA_DIR', 'NODE_EXTRA_CA_CERTS', 'BW_SESSION', 'VAULT_ITEM')) {
    $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
    New-Item -ItemType Directory -Path $local -Force | Out-Null
    $env:BITWARDENCLI_APPDATA_DIR = Join-Path $local 'bw'
    $env:NODE_EXTRA_CA_CERTS = Join-Path $local 'caddy-local-root.crt'
    if (!(Test-Path -LiteralPath $env:NODE_EXTRA_CA_CERTS)) { throw 'Local CA certificate missing. See README.md.' }
    $packageRoot = Join-Path (Split-Path -Parent $root) 'node_modules/@bitwarden/cli'
    $package = Get-Content -Raw (Join-Path $packageRoot 'package.json') | ConvertFrom-Json
    $cli = Join-Path $packageRoot $package.bin.bw
    Remove-Item Env:BW_SESSION -ErrorAction SilentlyContinue
    $status = & node $cli status | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Could not read CLI status' }
    if ($status.status -eq 'unauthenticated') {
        & node $cli config server https://localhost:8443
        if ($LASTEXITCODE -ne 0) { throw 'Could not configure Vaultwarden URL' }
        Write-Host 'Log in to your local vault. Enter your credentials only at the CLI prompts.'
        $session = & node $cli login --raw
    } else {
        if ($status.serverUrl -ne 'https://localhost:8443') { throw 'CLI is configured for a different server' }
        $session = & node $cli unlock --raw
    }
    if ($LASTEXITCODE -ne 0 -or !$session) { throw 'Vault unlock failed' }
    $env:BW_SESSION = ($session -join "`n").Trim()
    $session = $null
    $env:VAULT_ITEM = $Item
    $tokenPath = Join-Path $local 'api-token.key'
    if (!(Test-Path -LiteralPath $tokenPath)) {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $rng.Dispose()
        [IO.File]::WriteAllText($tokenPath, [Convert]::ToBase64String($bytes))
    }
    & node (Join-Path $root 'src/server.mjs')
} finally {
    if ($cli -and $env:BW_SESSION) { & node $cli lock | Out-Null }
    foreach ($name in $previous.Keys) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}


