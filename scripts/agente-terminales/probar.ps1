<#
  Prueba local del agente, sin red.

  Censa las consolas que ve y muestra PID, titulo y las ultimas lineas de cada
  una. Sirve para dos cosas: confirmar que la capa nativa compila en tu maquina,
  y ver que PID le toca a cada pestana antes de mandarle nada.

  El resultado va a un archivo y no a pantalla: para inspeccionar consolas
  ajenas hay que soltar la propia, y eso se lleva puesto el stdout del script.

  Uso:
    powershell -NoProfile -ExecutionPolicy Bypass -File probar.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File probar.ps1 -ProcesoId 12345 -Texto "hola"
#>

param(
  [int]$ProcesoId = 0,
  [string]$Texto = "",
  [int]$Lineas = 12,
  [string]$Salida = (Join-Path $env:TEMP "consolas-detectadas.txt")
)

$ErrorActionPreference = "Stop"

# Se reusa la capa nativa del agente en vez de copiarla: si divergen, la prueba
# deja de probar lo que corre de verdad.
$fuente = Get-Content (Join-Path $PSScriptRoot "agente-terminales.ps1") -Raw
$csharp = [regex]::Match($fuente, "(?s)Add-Type -Language CSharp -TypeDefinition @'(.*?)'@").Groups[1].Value
if (-not $csharp) { throw "No se pudo extraer el codigo C# de agente-terminales.ps1" }
Add-Type -Language CSharp -TypeDefinition $csharp

$PRIORIDAD = @{ "cmd" = 0; "powershell" = 0; "pwsh" = 0; "bash" = 1; "claude" = 2; "node" = 3 }

$reporte = New-Object System.Text.StringBuilder

if ($ProcesoId -gt 0 -and $Texto) {
  [Consolas]::Soltar()
  try {
    [Consolas]::Tipear($ProcesoId, $Texto, $true, 15)
    [void]$reporte.AppendLine("Tipeado en PID $ProcesoId : $Texto")
  } catch {
    [void]$reporte.AppendLine("ERROR tipeando en PID $ProcesoId : $($_.Exception.Message)")
  }
  Set-Content -Path $Salida -Value $reporte.ToString() -Encoding utf8
  exit 0
}

[Consolas]::Soltar()

$vistos = @{}
$candidatos = Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $PRIORIDAD.ContainsKey($_.ProcessName) -and $_.Id -ne $PID } |
  Sort-Object @{ Expression = { $PRIORIDAD[$_.ProcessName] } }, Id

$n = 0
foreach ($p in $candidatos) {
  $info = $null
  try { $info = [Consolas]::Inspeccionar($p.Id, $Lineas) } catch { continue }
  if ($null -eq $info) { continue }
  if ($vistos.ContainsKey($info.Hwnd)) { continue }
  $vistos[$info.Hwnd] = $true
  $n++

  [void]$reporte.AppendLine("")
  [void]$reporte.AppendLine(("=== [{0}] PID {1} ({2})  {3}" -f $n, $info.Pid, $p.ProcessName, $info.Titulo))
  [void]$reporte.AppendLine($info.Pantalla.TrimEnd())
}

[void]$reporte.AppendLine("")
[void]$reporte.AppendLine(("Encontradas: {0} consolas." -f $n))
Set-Content -Path $Salida -Value $reporte.ToString() -Encoding utf8
