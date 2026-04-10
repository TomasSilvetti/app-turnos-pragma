# porcion-004 — Endpoint: confirmar reprogramación (crear nueva reserva) [BACK]

**Estado:** 🔄 En progreso

**Historia de usuario:** HU-7: Reprogramación de clientes con reservas en conflicto
**Par:** porcion-003
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Crear el endpoint que recibe la confirmación de una reprogramación: crea una nueva reserva en estado `confirmed` para el slot seleccionado y marca la reserva original como `cancelled`, removiéndola de la lista de pendientes.

## Ejemplo de uso

El proveedor confirma el nuevo turno para Juan Pérez. La página llama a `POST /api/panel/reschedules` con el `bookingId` original y el nuevo `appointmentId`. El endpoint crea una nueva `Booking` confirmada y actualiza la original a `cancelled`. Juan desaparece de la lista.

## Criterios de aceptación

- [ ] El endpoint `POST /api/panel/reschedules` existe y responde solo a proveedores autenticados
- [ ] Recibe: `bookingId` (reserva original), `appointmentId` (nuevo slot), `clientName`, `clientPhone`
- [ ] Crea una nueva `Booking` con `status = confirmed` vinculada al nuevo `Appointment`
- [ ] Actualiza el `status` de la reserva original a `cancelled`
- [ ] El nuevo `Appointment` debe pertenecer al proveedor autenticado (validación de ownership)
- [ ] Si el slot seleccionado ya tiene una reserva activa, devuelve error 409
- [ ] Si el `bookingId` no existe o no pertenece al proveedor, devuelve error 404

## Pruebas

### Pruebas unitarias

- [ ] El servicio crea correctamente una nueva `Booking` con `status = confirmed`
- [ ] El servicio actualiza el `status` de la booking original a `cancelled`
- [ ] El servicio lanza error si el `appointmentId` ya tiene una reserva activa
- [ ] El servicio lanza error si el `bookingId` no pertenece al proveedor autenticado

### Pruebas de integración

- [ ] `POST /api/panel/reschedules` sin sesión activa devuelve 401
- [ ] Con datos válidos, crea la nueva reserva y cancela la original en una sola operación (transacción)
- [ ] Si el slot está ocupado, devuelve 409 y no modifica ninguna reserva
- [ ] Tras una reprogramación exitosa, el booking original ya no aparece en `GET /api/panel/reschedules`
