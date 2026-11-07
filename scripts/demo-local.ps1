# Modo demo: chat, recomendador y pegar listas con el modelo local, sin depender de Groq.
# Levanta llama.cpp en otra ventana y después la app. Ctrl+C detiene la app.
$ErrorActionPreference = 'Stop'
$env:UJ_CHAT_PROVIDER = 'llamacpp'
$env:UJ_EXTRACTION_PROVIDER = 'llamacpp'
$env:UJ_LOCAL_ADVISOR = '1'
$model = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'llama-local.ps1')) -PassThru
try {
    $ready = $false
    foreach ($try in 1..90) {
        try {
            Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:8081/health' | Out-Null
            $ready = $true
            break
        } catch { Start-Sleep -Seconds 2 }
    }
    if (-not $ready) { throw 'El modelo local no respondió en 3 minutos.' }
    & (Join-Path $PSScriptRoot 'dev.ps1') -SystemTrust
} finally {
    if (-not $model.HasExited) { & taskkill.exe /PID $model.Id /T /F | Out-Null }
}
