# porcion-008 — Endpoint: crear reserva con protección de concurrencia [BACK]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** porcion-007
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Crear el endpoint público que recibe los datos del cliente y el turno a reservar, verifica que el turno sigue disponible, y crea la `Booking` de forma atómica para evitar reservas dobles por concurrencia.

## Ejemplo de uso

El frontend envía `POST /api/p/peluqueria-ana/bookings` con `{ appointmentId, clientName, clientPhone }`. Si el turno está libre, se crea la reserva y se retorna el detalle. Si ya fue tomado, se retorna error 409.

## Criterios de aceptación

- [ ] El endpoint `POST /api/p/[slug]/bookings` existe y responde sin autenticación
- [ ] El body debe incluir `appointmentId`, `clientName` y `clientPhone` (todos obligatorios)
- [ ] Si falta algún campo obligatorio, responde con status 400 y mensaje descriptivo
- [ ] La verificación de disponibilidad y la creación del `Booking` ocurren dentro de una transacción de Prisma
- [ ] Si el turno ya tiene un `Booking` con `status = confirmed`, responde con status 409
- [ ] Si el turno existe y está disponible, crea el `Booking` con `status = confirmed` y retorna 201
- [ ] La respuesta de éxito incluye: `bookingId`, `appointmentId`, `time`, `date`, `price`, `businessName`
- [ ] Si el `appointmentId` no pertenece al slug indicado, responde con status 404

## Pruebas

### Pruebas unitarias

- [ ] El servicio lanza error si falta `clientName`, `clientPhone` o `appointmentId`
- [ ] El servicio lanza error 409 si el turno ya tiene booking confirmado
- [ ] El servicio crea correctamente el `Booking` con status `confirmed` cuando el turno está libre

### Pruebas de integración

- [ ] `POST /api/p/slug/bookings` con datos válidos retorna 201 y el detalle de la reserva
- [ ] Dos requests simultáneas sobre el mismo turno: solo una resulta en 201, la otra en 409
- [ ] `POST /api/p/slug/bookings` con `appointmentId` ya confirmado retorna 409
- [ ] `POST /api/p/slug/bookings` sin `clientPhone` retorna 400
