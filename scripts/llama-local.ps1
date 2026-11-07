# Levanta el modelo local con llama.cpp (Vulkan) solo en loopback, puerto 8081.
# Opcional: sin esto la app funciona igual, con Groq y con el orden determinístico.
param(
    [string]$Model = 'Qwen3.5-27B-UD-IQ3_XXS.gguf',
    [int]$Context = 16384
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$server = Join-Path $root '.tools/llama.cpp/llama-server.exe'
$path = Join-Path $root ".tools/models/$Model"
if (-not (Test-Path $server) -or -not (Test-Path $path)) {
    throw 'Falta llama.cpp o el modelo en .tools/. Ver "IA local" en el README.'
}
& $server -m $path -ngl 99 -c $Context --jinja --host 127.0.0.1 --port 8081 `
    --flash-attn on --cache-type-k q8_0 --cache-type-v q8_0 --parallel 1
