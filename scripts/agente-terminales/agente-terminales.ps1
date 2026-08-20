<#
  Agente de terminales adoptadas.

  Corre en la notebook y hace de puente entre /notas/consola y las pestanas de
  Windows Terminal que ya estan abiertas con un Claude Code adentro. Cada vuelta:

    1. censa las consolas que ve y manda titulo + foto de pantalla a la app
    2. pregunta si hay prompts para tipear y los tipea

  No abre puertos: todo el trafico sale de la notebook hacia afuera.

  El truco es AttachConsole: un proceso puede engancharse a la consola de otro y
  escribir en su buffer de entrada. Para Claude Code eso es indistinguible de
  que alguien teclee, asi que no hace falta foco ni traer la ventana al frente.
#>

param(
  [string]$BaseUrl      = $env:CONSOLA_BASE_URL,
  [string]$DeviceId     = $env:CONSOLA_DEVICE_ID,
  [string]$HarnessToken = $env:HARNESS_TOKEN,
  [int]$IntervaloMs     = 2000,
  [int]$Lineas          = 40,
  # Milisegundos entre bloques de tipeo. La TUI de Claude Code hace autocompletado
  # con "/" y "@": volcarle 2000 caracteres de golpe le come teclas.
  [int]$DelayTipeoMs    = 15
)

$ErrorActionPreference = "Stop"

if (-not $BaseUrl)      { $BaseUrl = "http://localhost:3000" }
if (-not $DeviceId)     { throw "Falta CONSOLA_DEVICE_ID (el deviceId de notas)." }
if (-not $HarnessToken) { throw "Falta HARNESS_TOKEN." }
$BaseUrl = $BaseUrl.TrimEnd("/")

$LogDir  = Join-Path $env:LOCALAPPDATA "consola-agente"
$LogFile = Join-Path $LogDir "terminales.log"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Log([string]$msg) {
  $linea = "{0}  {1}" -f (Get-Date -Format "dd/MM/yyyy HH:mm:ss"), $msg
  Add-Content -Path $LogFile -Value $linea -Encoding utf8
  try { Write-Host $linea } catch { }
}

# ---------------------------------------------------------------
# Capa nativa
# ---------------------------------------------------------------

Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public class Consolas {

  [StructLayout(LayoutKind.Sequential)]
  public struct COORD { public short X; public short Y; }

  [StructLayout(LayoutKind.Sequential)]
  public struct SMALL_RECT { public short Left, Top, Right, Bottom; }

  [StructLayout(LayoutKind.Sequential)]
  public struct CONSOLE_SCREEN_BUFFER_INFO {
    public COORD dwSize;
    public COORD dwCursorPosition;
    public ushort wAttributes;
    public SMALL_RECT srWindow;
    public COORD dwMaximumWindowSize;
  }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct KEY_EVENT_RECORD {
    [MarshalAs(UnmanagedType.Bool)] public bool bKeyDown;
    public ushort wRepeatCount;
    public ushort wVirtualKeyCode;
    public ushort wVirtualScanCode;
    public char UnicodeChar;
    public uint dwControlKeyState;
  }

  // INPUT_RECORD es un WORD de tipo seguido de una union alineada a 4 bytes.
  [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
  public struct INPUT_RECORD {
    [FieldOffset(0)] public ushort EventType;
    [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
  }

  const ushort KEY_EVENT = 0x0001;
  const uint GENERIC_READ = 0x80000000;
  const uint GENERIC_WRITE = 0x40000000;
  const uint FILE_SHARE_READ = 0x00000001;
  const uint FILE_SHARE_WRITE = 0x00000002;
  const uint OPEN_EXISTING = 3;
  static readonly IntPtr INVALID = new IntPtr(-1);

  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AttachConsole(uint dwProcessId);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool FreeConsole();
  [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr h);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern IntPtr CreateFileW(string name, uint access, uint share, IntPtr sec, uint disp, uint flags, IntPtr tmpl);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern uint GetConsoleTitleW(StringBuilder buf, uint size);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool GetConsoleScreenBufferInfo(IntPtr h, out CONSOLE_SCREEN_BUFFER_INFO info);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool ReadConsoleOutputCharacterW(IntPtr h, [Out] char[] buf, uint len, COORD coord, out uint leidos);

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool WriteConsoleInputW(IntPtr h, INPUT_RECORD[] recs, uint len, out uint escritos);

  public class Info {
    public int Pid;
    public long Hwnd;
    public string Titulo;
    public string Pantalla;
  }

  // Nuestra propia consola, para no censarnos a nosotros mismos.
  public static long HwndPropio = 0;

  public static void Soltar() {
    HwndPropio = GetConsoleWindow().ToInt64();
    FreeConsole();
  }

  static void Enganchar(int pid) {
    // Un proceso solo puede estar adjunto a una consola a la vez, asi que hay
    // que soltar la anterior aunque el attach previo haya fallado.
    FreeConsole();
    if (!AttachConsole((uint)pid))
      throw new Exception("AttachConsole(" + pid + ") fallo: " + Marshal.GetLastWin32Error());
  }

  // Devuelve null si el proceso no tiene consola, o si la tiene pero es de otro
  // nivel de integridad (una terminal abierta como administrador, tipicamente).
  public static Info Inspeccionar(int pid, int lineas) {
    try { Enganchar(pid); } catch { FreeConsole(); return null; }

    IntPtr salida = INVALID;
    try {
      long hwnd = GetConsoleWindow().ToInt64();
      if (hwnd == 0 || hwnd == HwndPropio) return null;

      StringBuilder sb = new StringBuilder(1024);
      GetConsoleTitleW(sb, 1024);

      // CONOUT$ hay que reabrirlo: los handles estandar del proceso siguen
      // apuntando a la consola vieja despues del attach.
      salida = CreateFileW("CONOUT$", GENERIC_READ | GENERIC_WRITE,
                           FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
      string pantalla = "";
      CONSOLE_SCREEN_BUFFER_INFO info;
      if (salida != INVALID && GetConsoleScreenBufferInfo(salida, out info)) {
        int ancho = info.dwSize.X;
        int fin = info.dwCursorPosition.Y;
        int desde = Math.Max(0, fin - lineas + 1);
        StringBuilder texto = new StringBuilder();
        char[] buf = new char[ancho];
        for (int y = desde; y <= fin; y++) {
          uint leidos;
          COORD c; c.X = 0; c.Y = (short)y;
          if (!ReadConsoleOutputCharacterW(salida, buf, (uint)ancho, c, out leidos)) break;
          texto.AppendLine(new string(buf, 0, (int)leidos).TrimEnd());
        }
        pantalla = texto.ToString();
      }

      Info r = new Info();
      r.Pid = pid;
      r.Hwnd = hwnd;
      r.Titulo = sb.ToString();
      r.Pantalla = pantalla;
      return r;
    } finally {
      if (salida != INVALID) CloseHandle(salida);
      FreeConsole();
    }
  }

  static INPUT_RECORD Tecla(char c, ushort vk, bool down) {
    INPUT_RECORD r = new INPUT_RECORD();
    r.EventType = KEY_EVENT;
    r.KeyEvent.bKeyDown = down;
    r.KeyEvent.wRepeatCount = 1;
    r.KeyEvent.wVirtualKeyCode = vk;
    r.KeyEvent.wVirtualScanCode = 0;
    r.KeyEvent.UnicodeChar = c;
    r.KeyEvent.dwControlKeyState = 0;
    return r;
  }

  static void Volcar(IntPtr entrada, INPUT_RECORD[] recs) {
    uint escritos;
    if (!WriteConsoleInputW(entrada, recs, (uint)recs.Length, out escritos))
      throw new Exception("WriteConsoleInput fallo: " + Marshal.GetLastWin32Error());
  }

  // Escribe el texto en el buffer de entrada de esa consola y opcionalmente
  // manda Enter. El Enter va en una llamada aparte y despues de una pausa: si
  // llega pegado al ultimo caracter, una TUI que todavia esta redibujando el
  // prompt puede mandar el mensaje a medio escribir.
  public static void Tipear(int pid, string texto, bool enter, int delayMs) {
    Enganchar(pid);
    IntPtr entrada = INVALID;
    try {
      entrada = CreateFileW("CONIN$", GENERIC_READ | GENERIC_WRITE,
                            FILE_SHARE_READ | FILE_SHARE_WRITE, IntPtr.Zero, OPEN_EXISTING, 0, IntPtr.Zero);
      if (entrada == INVALID)
        throw new Exception("No se pudo abrir CONIN$: " + Marshal.GetLastWin32Error());

      const int BLOQUE = 16;
      for (int i = 0; i < texto.Length; i += BLOQUE) {
        int largo = Math.Min(BLOQUE, texto.Length - i);
        INPUT_RECORD[] recs = new INPUT_RECORD[largo * 2];
        for (int j = 0; j < largo; j++) {
          char c = texto[i + j];
          recs[j * 2]     = Tecla(c, 0, true);
          recs[j * 2 + 1] = Tecla(c, 0, false);
        }
        Volcar(entrada, recs);
        if (delayMs > 0) System.Threading.Thread.Sleep(delayMs);
      }

      if (enter) {
        System.Threading.Thread.Sleep(250);
        INPUT_RECORD[] cr = new INPUT_RECORD[2];
        cr[0] = Tecla('\r', 0x0D, true);
        cr[1] = Tecla('\r', 0x0D, false);
        Volcar(entrada, cr);
      }
    } finally {
      if (entrada != INVALID) CloseHandle(entrada);
      FreeConsole();
    }
  }
}
'@

# ---------------------------------------------------------------
# App
# ---------------------------------------------------------------

$Headers = @{
  "x-device-id"     = $DeviceId
  "x-harness-token" = $HarnessToken
}

function Llamar([string]$metodo, [string]$ruta, $cuerpo) {
  $opciones = @{
    Uri         = "$BaseUrl$ruta"
    Method      = $metodo
    Headers     = $Headers
    TimeoutSec  = 20
    ContentType = "application/json; charset=utf-8"
  }
  if ($null -ne $cuerpo) {
    # El body va como bytes UTF-8 a mano: Invoke-RestMethod en PS 5.1 manda el
    # string en Latin-1 y los acentos del prompt llegan rotos.
    $opciones.Body = [System.Text.Encoding]::UTF8.GetBytes(($cuerpo | ConvertTo-Json -Depth 6 -Compress))
  }
  Invoke-RestMethod @opciones
}

# Se prefiere el shell (cmd/powershell) sobre el proceso de Claude Code: los dos
# comparten la misma consola, pero el shell vive lo que dura la pestana mientras
# que claude.exe puede reiniciarse y cambiar de PID.
$PRIORIDAD = @{ "cmd" = 0; "powershell" = 0; "pwsh" = 0; "bash" = 1; "claude" = 2; "node" = 3 }

function Censar {
  $vistos = @{}
  $salida = @()

  $candidatos = Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $PRIORIDAD.ContainsKey($_.ProcessName) -and $_.Id -ne $PID } |
    Sort-Object @{ Expression = { $PRIORIDAD[$_.ProcessName] } }, Id

  foreach ($p in $candidatos) {
    $info = $null
    try { $info = [Consolas]::Inspeccionar($p.Id, $Lineas) } catch { continue }
    if ($null -eq $info) { continue }
    # Varios procesos de una misma pestana comparten consola: el primero que
    # llega gana, y el orden de arriba hace que ese sea el shell.
    if ($vistos.ContainsKey($info.Hwnd)) { continue }
    $vistos[$info.Hwnd] = $true
    $salida += [pscustomobject]@{
      pid      = $info.Pid
      titulo   = $info.Titulo
      pantalla = $info.Pantalla
    }
  }
  return ,$salida
}

function Vuelta {
  $terminales = Censar
  Llamar "POST" "/api/notas/consola/terminales" @{ terminales = $terminales } | Out-Null

  $cola = Llamar "GET" "/api/notas/consola/teclas" $null
  foreach ($envio in @($cola.envios)) {
    $falla = $null
    try {
      [Consolas]::Tipear([int]$envio.pid, [string]$envio.texto, $true, $DelayTipeoMs)
      Log ("tipeado en PID {0}: {1}" -f $envio.pid, $envio.texto)
    } catch {
      $falla = $_.Exception.Message
      Log ("ERROR tipeando en PID {0}: {1}" -f $envio.pid, $falla)
    }
    Llamar "POST" "/api/notas/consola/teclas" @{ id = $envio.id; error = $falla } | Out-Null
  }
}

Log "====================================="
Log "Agente de terminales arrancando contra $BaseUrl"
[Consolas]::Soltar()
Log "Consola propia soltada. Los logs siguen en $LogFile"

$fallosSeguidos = 0
while ($true) {
  try {
    Vuelta
    $fallosSeguidos = 0
  } catch {
    $fallosSeguidos++
    Log ("fallo la vuelta ({0} seguidos): {1}" -f $fallosSeguidos, $_.Exception.Message)
    # Si la app esta caida o sin internet, no tiene sentido martillarla cada dos
    # segundos: se afloja hasta 30s y se vuelve sola cuando la app responde.
    Start-Sleep -Milliseconds ([Math]::Min(30000, $IntervaloMs * [Math]::Pow(2, [Math]::Min(4, $fallosSeguidos))))
    continue
  }
  Start-Sleep -Milliseconds $IntervaloMs
}
