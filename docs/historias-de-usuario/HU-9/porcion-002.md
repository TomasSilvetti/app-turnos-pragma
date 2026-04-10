# porcion-002 — Cards de turnos: estilos disponible/reservado [FRONT]

**Historia de usuario:** HU-9
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-001
**Estado:** 🔄 En progreso

## Descripción

Actualizar la grilla pública de turnos para mostrar todos los slots (disponibles y reservados) con estilos diferenciados.

- **Disponible:** fondo verde suave, clickeable
- **Reservado:** fondo gris, no clickeable, badge "Reservado"

Actualmente `BookingSection.tsx` filtra los slots con `bookedIds` antes de pasarlos a `AppointmentSlots`, ocultando los ya reservados. Ese filtro debe eliminarse para mostrarlos con el nuevo estilo.

## Cambios

**Archivo:** `src/components/public/AppointmentSlots.tsx`

1. Extender el tipo `Appointment` para incluir `booked: boolean` y `serviceTypes`.
2. Cambiar el estilo de la card según `booked`:
   - Disponible: borde verde, fondo verde suave (`border-green-200 bg-green-50`), hover habilitado
   - Reservado: borde gris, fondo gris (`border-[#E0E0DB] bg-[#F4F5F7]`), cursor no permitido, no llama `onSelect`
3. Agregar un badge/texto "Reservado" debajo del precio en los slots reservados.

**Archivo:** `src/components/public/BookingSection.tsx`

1. Extender el tipo `Slot` para incluir `booked: boolean` y `serviceTypes`.
2. Eliminar el filtro `!bookedIds.has(s.id)` en `appointmentsForDate` (ahora se muestran todos).
3. Mantener `bookedIds` para marcar como `booked: true` los que se reservan en la sesión actual (sin esperar recarga).

## Criterios de aceptación

- [ ] Los turnos disponibles se muestran con estilo verde
- [ ] Los turnos reservados se muestran en gris con el texto "Reservado" y no se pueden clickear
- [ ] Al reservar un turno en la sesión, se actualiza visualmente a "Reservado" sin recargar la página
- [ ] El número total de slots mostrados no cambia al reservar (el slot no desaparece, cambia de estado)

## Pruebas

- [ ] Un slot con `booked: true` renderiza con clase gris y muestra "Reservado"
- [ ] Un slot con `booked: true` no dispara `onSelect` al hacer click
- [ ] Un slot con `booked: false` renderiza con clase verde y es clickeable
- [ ] Después de completar una reserva, el slot pasa visualmente a "Reservado" en la misma sesión
