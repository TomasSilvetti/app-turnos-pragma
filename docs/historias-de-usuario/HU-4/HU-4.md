# HU-4: Consulta pública de turnos disponibles por prestador

**Como** cliente al que un prestador le compartió un link,
**quiero** ver los turnos disponibles de ese prestador organizados en un calendario mensual,
**para** poder navegar por los días con disponibilidad, elegir un turno y reservarlo.

## Descripción

El prestador comparte con sus clientes un link único basado en el slug de su negocio (`/p/[slug]`). Al ingresar, el cliente ve un mini calendario del mes actual donde están resaltados los días que tienen turnos disponibles. Por defecto el día seleccionado es el día actual. Debajo del calendario, en dos columnas de cards, se muestran los turnos disponibles del día seleccionado. Al hacer clic en un turno, el cliente puede reservarlo.

Esta historia cubre únicamente la vista pública de disponibilidad y el flujo de reserva del cliente. La carga de turnos por parte del prestador (selección de días y horarios disponibles) se define en HU-3. No se requiere que el cliente esté autenticado para consultar ni reservar.

## Cambios de base de datos requeridos (previos al desarrollo)

Antes de implementar esta historia, el schema de Prisma debe incorporar:

1. **Campo `date` en `Appointment`** — cada turno debe tener una fecha concreta (tipo `DateTime` o `String` en formato `YYYY-MM-DD`), no solo la hora.
2. **Campo `serviceProviderId` directo en `Appointment`** — para poder consultar `WHERE serviceProviderId = X AND date = Y` sin recorrer la cadena de joins `ScheduleConfig → BusinessProfile → ServiceProvider`.
3. **Modelo `Booking`** — registra la reserva de un cliente sobre un turno: `appointmentId`, `clientName`, `clientPhone`, datos mínimos de contacto, y estado (`pending` / `confirmed` / `cancelled`).

## Criterios de aceptación

### Vista pública del prestador

- [ ] Al acceder a `/p/[slug]`, el cliente ve el nombre y logo del negocio del prestador.
- [ ] Se muestra un mini calendario mensual con todos los días del mes; los días que tienen al menos un turno activo y disponible aparecen resaltados.
- [ ] El día actual está seleccionado por defecto al entrar a la página.
- [ ] Debajo del calendario se muestran los turnos disponibles del día seleccionado, organizados en dos columnas de cards.
- [ ] Cada card muestra el horario del turno y el precio.
- [ ] Si el día seleccionado no tiene turnos disponibles, se muestra un mensaje informativo ("No hay turnos disponibles para este día").
- [ ] Al hacer clic en otro día resaltado del calendario, los turnos debajo se actualizan para mostrar los de ese día.
- [ ] Los días sin turnos disponibles en el calendario no son seleccionables.
- [ ] La página no requiere que el cliente esté autenticado.

### Reserva de un turno

- [ ] Al hacer clic en la card de un turno disponible, se abre un formulario/modal de reserva.
- [ ] El formulario solicita nombre, apellido y teléfono del cliente (campos obligatorios).
- [ ] Al hacer clic en "Confirmar reserva", el sistema registra la reserva (`Booking`) y marca el turno como no disponible para nuevas reservas.
- [ ] El cliente ve una confirmación en pantalla con el detalle del turno reservado (día, hora, precio, nombre del negocio).
- [ ] Si el turno ya fue reservado por otro cliente antes de confirmar, se muestra un error y el turno desaparece de la lista.

## Flujos

### Flujo principal — Consultar turnos del día actual

1. El cliente accede a `/p/[slug]` compartido por el prestador.
2. El sistema carga el perfil del negocio asociado al slug.
3. Se muestra el mini calendario mensual con los días resaltados que tienen disponibilidad.
4. El día actual aparece seleccionado; debajo se muestran sus turnos disponibles en dos columnas de cards.
5. El cliente revisa los horarios y precios disponibles.

### Flujo alternativo 1 — Navegar a otro día

1. El cliente hace clic en un día resaltado del calendario.
2. El calendario actualiza la selección y los turnos debajo se reemplazan por los del nuevo día seleccionado.
3. Si no hay turnos disponibles ese día (o el día no está resaltado), no se puede seleccionar.

### Flujo alternativo 2 — Reservar un turno

1. El cliente hace clic en la card de un turno.
2. Se abre un formulario con campos: nombre y teléfono.
3. El cliente completa nombre, apellido y teléfono, y hace clic en "Confirmar reserva".
4. El sistema registra la reserva y muestra la confirmación con el resumen del turno.
5. La card del turno reservado desaparece de la lista de disponibles.

### Flujo alternativo 3 — Turno tomado en simultáneo

1. El cliente intenta reservar un turno que acaba de ser tomado por otra persona.
2. El sistema devuelve un error indicando que el turno ya no está disponible.
3. La lista de turnos se refresca y el turno tomado desaparece.

### Flujo alternativo 4 — Slug inexistente

1. El cliente accede a un link con un slug que no corresponde a ningún negocio registrado.
2. El sistema muestra una página 404 con un mensaje claro.

## Notas técnicas

⚠️ **Schema:** Esta historia requiere que `Appointment` tenga `date` y `serviceProviderId` antes de poder implementar la consulta pública. Verificar que las migraciones de Prisma correspondientes estén aplicadas.

⚠️ **Ruta pública:** La ruta `/p/[slug]` es de acceso público (no protegida por sesión). El middleware de autenticación no debe bloquearla.

⚠️ **Consulta de disponibilidad:** El endpoint público debe retornar únicamente los turnos donde `isActive = true` y que no tengan una reserva confirmada. Debe aceptar `slug` y `date` como parámetros.

⚠️ **Concurrencia en reservas:** Al crear una `Booking`, proteger contra race conditions usando una transacción que verifique disponibilidad y cree la reserva atómicamente.

⚠️ **Días resaltados en el calendario:** Para construir el calendario mensual, el sistema necesita conocer qué días del mes tienen turnos disponibles. Se recomienda un endpoint que, dado un `slug` y un `mes/año`, retorne la lista de fechas con disponibilidad.
