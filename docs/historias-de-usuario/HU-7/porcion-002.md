# porcion-002 — Página /panel/reprogramaciones — lista y estado vacío [FRONT]

**Historia de usuario:** HU-7: Reprogramación de clientes con reservas en conflicto
**Par:** porcion-001
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Crear la página `/panel/reprogramaciones` que muestra la lista de clientes con reservas pendientes de reprogramación. Cada fila muestra los datos del cliente y el turno original, con un botón "Reprogramar". Si no hay pendientes, se muestra un estado vacío.

## Ejemplo de uso

El proveedor navega a `/panel/reprogramaciones` y ve una lista con filas como: "Juan Pérez — +54 11 1234-5678 — Consulta — Lunes 7 de abril, 10:00 hs — [Reprogramar]". Si no hay nadie pendiente, ve el mensaje "No hay reprogramaciones pendientes."

## Criterios de aceptación

- [ ] La página existe en la ruta `/panel/reprogramaciones` y carga los datos desde `GET /api/panel/reschedules`
- [ ] Cada item de la lista muestra: nombre completo, teléfono, tipo de turno original, fecha y hora del turno original
- [ ] Cada item tiene un botón "Reprogramar" visible y accesible
- [ ] Si la lista está vacía, se muestra el mensaje "No hay reprogramaciones pendientes."
- [ ] Mientras se cargan los datos, se muestra un estado de carga (skeleton o spinner)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El componente de lista renderiza correctamente con un array de clientes
- [ ] El componente muestra el estado vacío cuando el array está vacío
- [ ] El componente muestra el estado de carga mientras `isLoading` es true
- [ ] Cada fila muestra nombre, teléfono, tipo de turno, fecha y hora correctamente

### Pruebas de integración

- [ ] La página llama a `GET /api/panel/reschedules` al montarse
- [ ] Si la API devuelve un array con datos, se renderizan todas las filas
- [ ] Si la API devuelve un array vacío, se muestra el mensaje de estado vacío
- [ ] El botón "Reprogramar" de cada fila es visible y clickeable
