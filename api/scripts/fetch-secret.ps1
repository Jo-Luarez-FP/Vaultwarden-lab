$ErrorActionPreference = 'Stop'
$token = (Get-Content -Raw (Join-Path (Split-Path -Parent $PSScriptRoot) '.local/api-token.key')).Trim()
Invoke-RestMethod -Uri 'http://127.0.0.1:8787/secret' -Headers @{ Authorization = "Bearer $token" }


