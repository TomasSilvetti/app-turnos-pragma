# HU-7: Reprogramación de clientes con reservas en conflicto

**Como** proveedor de servicios,
**quiero** ver y gestionar los clientes cuyas reservas quedaron sin turno válido tras un cambio de configuración,
**para** poder contactarlos y asignarles un nuevo turno sin perder su información.

## Descripción

Cuando el proveedor actualiza su configuración de horarios y algunos turnos ya reservados desaparecen, esas reservas quedan marcadas como pendientes de reprogramación. Esta historia cubre la página `/panel/reprogramaciones`, donde el proveedor puede ver esos clientes, contactarlos y asignarles un nuevo turno usando el mismo selector de turnos que ven los clientes, con los datos del cliente precargados.

## Criterios de aceptación

- [ ] El proveedor puede ver la lista de clientes con reservas pendientes de reprogramación
- [ ] Cada item de la lista muestra: nombre completo, teléfono, tipo de turno original, fecha y hora del turno original
- [ ] El proveedor puede iniciar el flujo de reprogramación desde cada item con un botón "Reprogramar"
- [ ] Al hacer clic en "Reprogramar", se abre el selector de turnos (calendario + slots disponibles)
- [ ] Al seleccionar un turno, el formulario de reserva se autocompleta con los datos del cliente (nombre, teléfono)
- [ ] El proveedor confirma y se crea la nueva reserva en estado activo
- [ ] El cliente reprogramado desaparece de la lista de pendientes
- [ ] Si no hay clientes pendientes de reprogramación, se muestra un estado vacío: "No hay reprogramaciones pendientes."
- [ ] La lista es accesible desde `/panel/reprogramaciones` y también mediante un aviso/badge en el panel cuando hay pendientes

## Flujos

### Flujo principal — Reprogramar un cliente

1. El proveedor navega a `/panel/reprogramaciones`
2. Ve la lista de clientes afectados con su información de contacto y el turno original
3. Hace clic en "Reprogramar" en un cliente
4. Se abre el selector de turnos (mismo calendario y cards que la vista pública `/p/[slug]`)
5. El proveedor navega al mes/día deseado y selecciona un slot disponible
6. El formulario de confirmación aparece con nombre y teléfono del cliente ya completados
7. El proveedor confirma la nueva reserva
8. El cliente desaparece de la lista; el turno queda reservado

### Flujo alternativo — Sin pendientes

1. El proveedor accede a `/panel/reprogramaciones`
2. No hay reservas en estado `requires_reschedule`
3. Se muestra mensaje: "No hay reprogramaciones pendientes."

### Flujo alternativo — No hay turnos disponibles para reprogramar

1. El proveedor abre el selector de turnos para un cliente
2. No hay turnos disponibles en los próximos días/semanas (agenda llena o sin configuración)
3. El selector muestra estado vacío con mensaje: "No hay turnos disponibles. Revisá tu configuración de horarios."
4. El cliente permanece en la lista de pendientes

### Flujo alternativo — Aviso en el panel

1. El proveedor guarda una nueva configuración que genera conflictos (ver HU-6)
2. En el panel principal y/o en el menú lateral aparece un badge/aviso: "X clientes necesitan ser reprogramados"
3. El clic en el aviso lleva a `/panel/reprogramaciones`

## Notas técnicas

⚠️ **Base de datos:** Esta historia requiere que el modelo `Booking` tenga un campo de estado que incluya el valor `requires_reschedule` (además de los existentes `pending`, `confirmed`, `cancelled`). La página consulta todas las reservas con ese estado pertenecientes al proveedor autenticado. Al confirmar la reprogramación, se crea una nueva `Booking` en estado `confirmed` y la reserva original se marca como `cancelled` o se elimina.
