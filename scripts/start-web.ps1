$ErrorActionPreference = 'Stop'
$runtimeBin = 'C:\Users\Eder-Detic\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin'
$fallbackBin = 'C:\Users\Eder-Detic\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback'
$env:PATH = "$runtimeBin;$fallbackBin;$env:PATH"
Set-Location (Split-Path -Parent $PSScriptRoot)
pnpm --filter '@omr/web' dev --host 127.0.0.1
