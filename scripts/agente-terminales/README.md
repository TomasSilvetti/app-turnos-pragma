# Agente de terminales

Puente entre `/notas/consola` y las pestañas de Windows Terminal que ya están
abiertas en la notebook con un Claude Code adentro. Desde el celular se elige
una pestaña, se escribe el prompt, y el agente lo tipea ahí con Enter.

No abre puertos ni necesita túnel: el agente sale de la notebook hacia la app.

## Cómo funciona

Windows deja que un proceso se enganche a la consola de otro (`AttachConsole`) y
le escriba en el buffer de entrada (`WriteConsoleInput`). Para Claude Code eso es
indistinguible de que alguien teclee, así que **no hace falta foco ni traer la
ventana al frente** — podés estar usando la compu mientras.

Cada vuelta (2 segundos):

1. censa las consolas que ve y le manda a la app el PID, el título y las últimas
   40 líneas de pantalla de cada una
2. pide la cola de prompts pendientes y los tipea

## Puesta en marcha

1. Editá `iniciar.bat` y poné `CONSOLA_DEVICE_ID` y `HARNESS_TOKEN`.
   El deviceId es el mismo que usa la app de notas (`notas_device_id` en el
   localStorage del navegador).
2. Doble clic en `iniciar.bat`.

Para que arranque solo con Windows, poné un acceso directo a `iniciar.bat` en
`shell:startup`.

Los logs van a `%LOCALAPPDATA%\consola-agente\terminales.log`. La consola propia
del agente se suelta al arrancar (es requisito para engancharse a otras), así que
el log en archivo es la única forma de ver qué está haciendo.

## Probar sin la app

```powershell
# lista las consolas que ve, con su PID y su pantalla
powershell -NoProfile -ExecutionPolicy Bypass -File probar.ps1

# tipea algo en una de ellas
powershell -NoProfile -ExecutionPolicy Bypass -File probar.ps1 -ProcesoId 12345 -Texto "hola"
```

El resultado queda en `%TEMP%\consolas-detectadas.txt`.

## Límites conocidos

- **Los prompts van en una sola línea.** En la TUI de Claude Code un Enter manda
  el mensaje, así que la app aplasta los saltos de línea a espacios antes de
  encolar. Un prompt de tres párrafos se mandaría partido en tres.
- **No sabe en qué estado está la sesión.** Si Claude Code está esperando que
  respondas "1/2/3" a una pregunta, el prompt se mete como respuesta a eso. Para
  eso está la foto de pantalla: mirala antes de mandar.
- **`/` y `@` abren menús.** El tipeo va en bloques de 16 caracteres con pausas
  para no atropellar al autocompletado, pero un prompt que arranca con `/` puede
  disparar el menú de comandos.
- **Terminales elevadas.** Una pestaña abierta como administrador sólo se puede
  tocar si el agente también corre elevado.
- **No revive nada.** El agente se cuelga de procesos ajenos; una pestaña cerrada
  desaparece de la lista y no se puede reabrir desde el celular.
