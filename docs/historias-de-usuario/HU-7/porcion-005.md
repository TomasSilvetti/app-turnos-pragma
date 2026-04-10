# porcion-005 — Badge de pendientes en el panel lateral [FRONT]

**Historia de usuario:** HU-7: Reprogramación de clientes con reservas en conflicto
**Par:** porcion-006
**Tipo:** FRONT
**Prerequisitos:** porcion-002
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Mostrar en el menú lateral del panel un badge o aviso con el número de clientes pendientes de reprogramación. Al hacer clic, navega a `/panel/reprogramaciones`. Si no hay pendientes, el badge no se muestra.

## Ejemplo de uso

El proveedor está en su panel y ve en el menú lateral el ítem "Reprogramaciones" con un badge rojo que muestra "3". Al hacer clic, va a `/panel/reprogramaciones`. Cuando reprograma a todos, el badge desaparece.

## Criterios de aceptación

- [ ] En el menú lateral del panel, el ítem "Reprogramaciones" muestra un badge con el conteo cuando hay pendientes
- [ ] El badge no se muestra si el conteo es 0
- [ ] El clic en el ítem (con o sin badge) navega a `/panel/reprogramaciones`
- [ ] El conteo se obtiene de `GET /api/panel/reschedules/count`
- [ ] El badge se actualiza al volver a `/panel/reprogramaciones` (revalidación al foco o navegación)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El badge se renderiza cuando el conteo es mayor a 0
- [ ] El badge no se renderiza cuando el conteo es 0
- [ ] El badge muestra el número correcto recibido como prop

### Pruebas de integración

- [ ] El componente del menú lateral llama a `GET /api/panel/reschedules/count` al montarse
- [ ] Al navegar a `/panel/reprogramaciones` y volver, el conteo se actualiza
- [ ] Si la API falla, el badge no se muestra (fallo silencioso, sin romper el layout)
