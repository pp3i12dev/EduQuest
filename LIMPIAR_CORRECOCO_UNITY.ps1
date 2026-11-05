# EduQuest - Limpieza de CorreCoco que sigue provocando errores de compilacion.
# USO desde la raiz del repo:
#   powershell -ExecutionPolicy Bypass -File .\LIMPIAR_CORRECOCO_UNITY.ps1
#   powershell -ExecutionPolicy Bypass -File .\LIMPIAR_CORRECOCO_UNITY.ps1 -Aplicar
# Opcional si el proyecto Unity tiene otro nombre:
#   ... -RutaAssets "C:\ruta\unity-app\Assets" -Aplicar

param(
    [switch]$Aplicar,
    [string]$RutaAssets = ""
)
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $RutaAssets) {
    $candidates = @(
        (Join-Path $scriptDir 'unity-app\Assets'),
        (Join-Path $scriptDir 'Unity\Assets'),
        (Join-Path $scriptDir 'unity\Assets'),
        (Join-Path $scriptDir 'Assets')
    )
    $found = @($candidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ '_Project') -PathType Container })
    if ($found.Count -eq 0) { throw 'No encontre Assets\_Project. Pasame la ruta mediante -RutaAssets.' }
    if ($found.Count -gt 1) { throw 'Hay varios proyectos Unity posibles. Especifica -RutaAssets.' }
    $RutaAssets = $found[0]
}
$RutaAssets = (Resolve-Path -LiteralPath $RutaAssets).Path
if (-not (Test-Path -LiteralPath (Join-Path $RutaAssets '_Project') -PathType Container)) {
    throw "La carpeta no parece ser Assets de EduQuest: $RutaAssets"
}
Write-Host "Assets: $RutaAssets" -ForegroundColor Cyan
$relative = @(
    '_Project\Juegos\CorreCoco',
    '_Project\Juegos\CorreCoco.meta',
    '_Project\Juegos\Integraciones\CorreCoco',
    '_Project\Juegos\Integraciones\CorreCoco.meta'
)
$foundFiles = 0
foreach ($rel in $relative) {
    $path = Join-Path $RutaAssets $rel
    if (-not (Test-Path -LiteralPath $path)) { Write-Host "Ya ausente: $rel"; continue }
    $foundFiles++
    if ($Aplicar) {
        Remove-Item -LiteralPath $path -Recurse -Force
        Write-Host "ELIMINADO: $rel" -ForegroundColor Green
    } else {
        Write-Host "Se eliminaria: $rel" -ForegroundColor Yellow
    }
}
if (-not $Aplicar) {
    Write-Host 'SIMULACION: no se borro nada. Cierra Unity, respalda Assets y ejecuta con -Aplicar.' -ForegroundColor Yellow
} else {
    Write-Host 'Limpieza finalizada. Abri Unity para que reimporte y compile.' -ForegroundColor Green
}
# Solo reportar restos. No borrar archivos arbitrarios fuera de esas rutas.
$integration = Join-Path $RutaAssets '_Project\Juegos\Integraciones'
if (Test-Path -LiteralPath $integration) {
    $other = @(Get-ChildItem -LiteralPath $integration -Recurse -Filter '*Corre*' -File -ErrorAction SilentlyContinue)
    if ($other.Count -gt 0) {
        Write-Warning 'Quedan otros archivos con Corre en Integraciones; revisalos antes de borrarlos:'
        $other | ForEach-Object { Write-Host $_.FullName }
    }
}
