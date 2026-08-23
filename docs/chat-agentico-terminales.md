# Chat agéntico + orquestador de terminales — plan de desarrollo

Este documento junta todo lo definido sobre tres bloques relacionados del módulo
`notas`: el orquestador de terminales (`/notas/consola`), la voz a texto, y el
chat agéntico nuevo que se apoya en los dos anteriores. Pensado para que una
sesión nueva pueda arrancar a construir sin necesitar el contexto de la
conversación donde se definió.

## Orden sugerido

1. Grupo A — fixes y features del orquestador de terminales (autocontenido, sin
   dependencias nuevas).
2. Voz a texto (chico, independiente de todo lo demás).
3. Chat agéntico — depende de que el grupo A esté sólido, porque lo usa como
   motor de ejecución.
4. Mover todo el módulo de consola a pragmaMonitor — al final, cuando 1-3 estén
   estables. Requiere agregar el repo de pragmaMonitor a la sesión que lo haga;
   no está en el scope de este repo.

---

## Grupo A — Orquestador de terminales

Todo lo de este bloque vive en `src/components/notas/consola/`,
`src/app/api/notas/consola/`, `src/lib/notas/consola.ts` y
`scripts/agente-terminales/agente-terminales.ps1`.

### A.1 — Ya hecho: terminales que se mostraban "vivas" sin estarlo

Bug real, reproducido con capturas: terminales cerradas hacía días se seguían
mostrando como abiertas, y terminales nuevas no aparecían. Causa: `viva` es una
columna que solo se corrige cuando llega un censo nuevo del agente — si el
agente se cae, la columna miente para siempre.

Fix ya aplicado: `terminalVigente()` en `src/lib/notas/consola.ts` (vivo = flag
en `true` **y** `vistoEn` de menos de 30s), usado en el GET de
`/api/notas/consola/terminales` (corrige `viva` antes de responder) y en el
POST de `/api/notas/consola/terminales/[id]` (no deja encolar texto a una
terminal en realidad muerta). Verificado con `tsc` y `eslint`.

### A.2 — Pendiente: por qué el agente de PowerShell dejó de reportar

No resuelto todavía, y no se puede resolver desde este repo — hay que mirar en
la notebook. Pasos:
- Revisar `%LOCALAPPDATA%\consola-agente\terminales.log` alrededor del momento
  en que dejó de actualizar.
- Si el proceso se cayó por una excepción no atrapada, o si fue la PC la que
  durmió/rebotó, la solución es distinta en cada caso.
- Candidato a implementar: envolver `iniciar.bat` en una tarea programada de
  Windows con reinicio automático, en vez de depender del acceso directo
  manual en `shell:startup` (que el README ya marca como paso opcional, no
  viene solo).

### A.3 — Nueva feature: abrir una terminal nueva desde el celular

Hoy el agente solo puede tipear en terminales que **ya existen**
(`AttachConsole` + `WriteConsoleInput`, en `agente-terminales.ps1`). Abrir una
terminal nueva es un mecanismo distinto y más simple — no reusa esas
funciones, es `Start-Process "wt.exe" -d <directorio> cmd /k claude` (o
equivalente).

Requiere:
- Un selector de directorio en la UI que funcione como buscador/autocomplete
  sobre directorios ya usados antes (no un browser de filesystem real).
- Guardar los directorios usados por `deviceId` con fecha de último uso —
  tabla nueva en Prisma.
- Un tipo de acción nuevo en la cola de la terminal (`abrir`, distinto de
  `texto` y `tecla`) que el agente de PowerShell distinga y ejecute con
  `Start-Process` en vez de `Tipear`/`TeclaSuelta`.

### A.4 — Nueva feature: cerrar terminales

No existe hoy — el agente solo sabe tipear texto o mandar `Esc`
(`TECLAS = ["esc"]` en `terminales/[id]/route.ts`). Agregar una acción
`cerrar` que en el agente haga `Stop-Process -Id $pid -Force` (más confiable
que simular "exit" tipeado, que necesitaría salir de Claude Code primero).

### A.5 — UI: zoom de letra por terminal

Control para agrandar/achicar la fuente del `<pre>` que muestra la pantalla
capturada en `Terminales.tsx`. Estado local, sin necesidad de guardar
preferencia en el servidor salvo que se quiera persistir entre sesiones.

### A.6 — UI: detectar y linkificar URLs en la pantalla capturada

Cuando el texto capturado de una terminal (`terminal.pantalla` en
`Terminales.tsx`) contiene una URL (por ejemplo, el link de un artifact o
informe generado por Claude Code), tiene que ser tocable desde el celular sin
copiar y pegar. Cambio acotado al render: regex de URL sobre el `<pre>`,
envuelta en `<a target="_blank">`.

### A.7 — Deprecar el chat de consola actual

`Chat.tsx` (sesión única contra `/api/notas/consola/sesiones/[id]`, modelo
`ConsolaSesion`) se reemplaza por el chat agéntico del bloque C. Decidir si se
borra el modelo y las rutas o si se deja de exponer en la UI nada más — de
cualquier forma no se sigue desarrollando.

### A.8 — Sin cambios

El botón de `Esc` (interrumpir / hacer login y cambiar de cuenta OAuth) se
queda exactamente como está — confirmado como imprescindible.

---

## Voz a texto

Objetivo: que escribir un prompt en el chat se pueda hacer hablando, sin
depender del dictado del teclado del sistema operativo.

- Usar la **Web Speech API** del navegador (`SpeechRecognition` /
  `webkitSpeechRecognition`) — nativa, gratis, sin backend, sin API key.
  Soporte bueno en Chrome/Android, que es donde se usa esto principalmente.
  No funciona en Firefox y es inconsistente en Safari/iOS — asumido como
  aceptable.
- No hace falta guardar el audio original, solo el texto transcripto termina
  en el input del prompt.
- Plan B, solo si la calidad de la Web Speech API no convence en el uso real:
  grabar con `MediaRecorder`, subir el blob (mismo patrón que ya existe para
  imágenes), y mandarlo a un servicio de transcripción externo tipo Whisper.
  Esto sí requiere una API key nueva — no arrancar por acá.

---

## Chat agéntico

### C.1 — Qué es

La primera de hasta 4 terminales abiertas es una sesión real de Claude Code,
adoptada por el mismo mecanismo que el resto (grupo A), que se usa como chat
desde el celular. No tiene un rol especial marcado en el modelo de datos — es
una terminal más; la diferencia es de uso, no de esquema. Desde ahí se abren
las otras terminales de trabajo.

### C.2 — Tope de paralelismo

Máximo 3 terminales de trabajo en paralelo (+ 1 la del chat = 4 terminales
abiertas en total). Hay que implementar el chequeo de capacidad antes de abrir
una terminal nueva — si ya hay 3 terminales de trabajo vivas, no se abre una
cuarta hasta que se libere una.

### C.3 — Modos de despacho de una tarea

Reusa el enum `ESTADOS` que ya existe en `src/lib/notas/trabajo.ts` — no hace
falta ningún estado nuevo para esto:

- "Mandalo a pendientes": crea el `TrabajoItem` en estado `pendiente`, no
  dispara nada más.
- "Mandalo a desarrollar": crea el ítem y en el momento abre una terminal de
  trabajo (respetando el tope de C.2).
- Siempre manual — decisión tomada explícitamente en contra de un despachador
  automático que tome de la cola solo, para no sumar otro proceso que se
  pueda morir en silencio (como pasó con el agente de terminales).

### C.4 — Subdivisión de un mensaje largo en varias tareas

Reusa tal cual el mecanismo que ya existe para la itemización: cajas editables
sobre el texto (`OverlaySugerencias.tsx`) con manijas para ajustar qué bloques
entran en cada tarea, y confirmar arma un `TrabajoItem` con su texto e
imágenes (`sugerencias/[id]/confirmar/route.ts`). La única diferencia real es
la fuente del texto largo: un mensaje del chat en vez de la bandeja de notas.

### C.5 — Cómo el chat mueve/consulta tareas

El chat agéntico **no necesita una tool formal tipo MCP** para operar la
bandeja. Al ser una sesión real de Claude Code con bash, alcanza con darle las
credenciales que ya usa el harness (`deviceId`, `HARNESS_TOKEN`, URL base) para
que llame por `curl` a los endpoints que ya existen bajo
`/api/notas/trabajo/*` — la misma flexibilidad que tocar la base directo, sin
saltarse las reglas de negocio.

**Importante:** el PATCH de `items/[id]` (`src/app/api/notas/trabajo/items/[id]/route.ts`)
ya tiene lógica no trivial en los cambios de estado: resetea `intentos` al
sacar algo de `bloqueado`, devuelve el intento gastado al pausar desde
`en_curso`, limpia `completadoEn`. Existe por un incidente real (comentario en
el código: "el mismo agujero por el que se fueron 17 ítems el 03/08"). El chat
agéntico tiene que mover ítems **siempre** a través de este endpoint — nunca
escribiendo directo a la base ni editando código para lograrlo.

### C.6 — Aislamiento de terminales en paralelo: worktree por tarea

Necesario porque 3 terminales trabajando a la vez sobre el mismo directorio y
la misma rama de git se van a pisar entre sí.

Al confirmar una tarea:
1. Crear una rama nueva desde `main` (`feature/<id-del-item>-<slug>`).
2. Crear un `git worktree` en un path predecible (ej.
   `...\Proyectos\worktrees\<id>`).
3. Abrir la terminal de trabajo con ese worktree como directorio — reusa A.3.
4. Guardar `rama` y `rutaWorktree` como columnas nuevas en `TrabajoItem`.

Al terminar el trabajo, la terminal corre `gh pr create` (requiere `gh` CLI
autenticado en la notebook). La app de notas no necesita hablar con la API de
GitHub para nada de esto — solo guarda la URL que devuelve `gh pr create` en
un campo nuevo `prUrl` del `TrabajoItem`.

### C.7 — Bandeja de completados

- Botón que abre el `prUrl` guardado — la revisión y el merge pasan en GitHub
  (vista de diff nativa, ya es usable desde el celular), no en un visor propio
  construido en la app.
- Botón de borrar: borra el ítem, sus imágenes (ya existe
  `borrarImagenesDeItem`), **y también** el worktree y la rama — si no,
  cada tarea revisada deja basura en disco para siempre.

### C.8 — Estado nuevo: conflicto de merge

`conflicto_merge`, agregado a `ESTADOS`, separado de `bloqueado` a propósito
(`bloqueado` significa "el agente no pudo avanzar solo"; esto significa "el
trabajo terminó bien, pero no entra a `main` sin resolver un conflicto,
típicamente porque otra tarea en paralelo se mergeó primero"). Se llega acá
cuando `gh pr merge` (o el intento de merge) informa que no es mergeable.
Bandeja propia. Acción "mandar a arreglar el conflicto": abre una terminal
nueva sobre el mismo worktree, hace `fetch` + merge/rebase de `main`,
resuelve, pushea, reintenta el merge del PR.

### C.9 — Veredicto final en el chat

Cada terminal de trabajo, al terminar (o si necesita que el usuario haga algo
manual — ej. "andá a esta web, iniciá sesión, creá un proyecto y traeme la API
key"), tiene que dejar un log estructurado con la conclusión y los pasos a
seguir — no un simple "completado". Ese texto es lo que se muestra en el chat
principal en vez de un log de una línea genérico, y es el cuerpo de la
notificación (C.11). Se implementa como parte del prompt inicial que se le
tipea a cada terminal de trabajo al abrirla: instruir explícitamente que
cierre con ese bloque de veredicto.

### C.10 — Evitar sesiones (terminales) eternas

Reusa dos conceptos que ya existen en `src/lib/notas/trabajo.ts` y no hacía
falta inventar nada nuevo:
- `limiteSesionMin` (ya existe en `estadoHarness`, 90 min por defecto): tope
  de tiempo por terminal.
- El tipo de log `handoff` (ya existe en `TIPOS_LOG`): al llegar el tope, la
  terminal escribe un handoff con el estado real del trabajo, se cierra
  (reusa A.4), y se abre una terminal nueva que arranca leyendo ese handoff en
  vez de acumular todo el contexto anterior.

Aplica también a la terminal del chat principal, no solo a las de trabajo —
mismo mecanismo, mismo tope.

### C.11 — Notificaciones

Al pasar a `completado`, `bloqueado`, o `conflicto_merge`:
- Push: reusar `sendPushToDevice` de `src/lib/notas/notas-push.ts` — ya existe
  completo, reusa el stack VAPID de la app principal. Es una llamada, no una
  feature nueva.
- Mail: no hay helper compartido todavía (cada ruta instancia `Resend` suelto
  — ver `forgot-password/route.ts`, `recuperar-contrasena/route.ts` x2).
  Escribir un helper análogo a `sendPushToDevice`, reusando la
  `RESEND_API_KEY` ya configurada — no hace falta cuenta ni proveedor nuevo.
- El cuerpo de ambas notificaciones lleva el veredicto de C.9, no un genérico
  "tu tarea terminó".

### C.12 — Control de cuentas OAuth

Antes de abrir una terminal de trabajo nueva, consultar
`/api/notas/trabajo/cuentas/disponibles` (ya existe, es el mismo pool que
usa el harness) para no arrancar una terminal con una cuenta que ya está en
uso por otra terminal en paralelo.

---

## Mover el módulo de consola a pragmaMonitor

Decisión tomada: sí, migrar, pero al final — después de que los bloques
anteriores estén estables, para no diagnosticar bugs en dos repos a la vez.
`pragmaMonitor` es un repositorio separado, transversal a todas las apps del
usuario. La sesión que encare esta parte necesita que se le agregue ese repo
explícitamente, no está disponible por defecto.
