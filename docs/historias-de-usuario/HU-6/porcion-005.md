# porcion-005 — Banner de reservas pendientes de reprogramación en el panel [FRONT]

**Historia de usuario:** HU-6: Configuración de horarios con generación lazy de turnos
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-003

**Estado:** completada

## Descripción

Mostrar un banner de aviso en el panel del proveedor cuando tiene reservas con estado `requires_reschedule`, indicando cuántos clientes necesitan ser reprogramados y con un enlace a la sección de reprogramaciones.

## Ejemplo de uso

El proveedor actualiza su configuración y 3 reservas quedan sin turno válido. La próxima vez que accede a su panel, ve un banner amarillo: "Tenés 3 clientes que necesitan ser reprogramados" con un botón "Ver reprogramaciones" que lleva a `/panel/reprogramaciones`.

## Criterios de aceptación

- [ ] El banner se muestra en el panel principal cuando existe al menos una reserva con estado `requires_reschedule` para el proveedor autenticado
- [ ] El banner muestra el conteo exacto de reservas afectadas
- [ ] El banner incluye un enlace a `/panel/reprogramaciones`
- [ ] Si no hay reservas en estado `requires_reschedule`, el banner no se renderiza
- [ ] El banner tiene estilo de advertencia (color amarillo/naranja) claramente diferenciado del resto del panel
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El componente no se renderiza cuando `count === 0`
- [ ] El componente se renderiza con el texto correcto cuando `count === 1`: "Tenés 1 cliente que necesita ser reprogramado"
- [ ] El componente se renderiza con el texto correcto cuando `count > 1`: "Tenés X clientes que necesitan ser reprogramados"
- [ ] El enlace del banner apunta a `/panel/reprogramaciones`

### Pruebas de integración

- [ ] Al cargar el panel con reservas `requires_reschedule` existentes, el banner aparece con el conteo correcto
- [ ] Al cargar el panel sin reservas `requires_reschedule`, el banner no aparece en el DOM
