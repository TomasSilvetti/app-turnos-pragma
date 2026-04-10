# porcion-001 — Migración: `date`, `serviceProviderId` en `Appointment` y modelo `Booking` [BACK]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** —
**Tipo:** BACK
**Prerequisitos:** 
**estado**: completada

## Descripción

Actualizar el schema de Prisma para agregar los campos `date` y `serviceProviderId` al modelo `Appointment`, y crear el nuevo modelo `Booking` que registra las reservas de los clientes.

## Ejemplo de uso

Una vez aplicada la migración, es posible consultar `Appointment` filtrando por `serviceProviderId` y `date` directamente, y crear registros en `Booking` con el nombre, teléfono y estado de la reserva.

## Criterios de aceptación

- [ ] El modelo `Appointment` tiene el campo `date` de tipo `String` en formato `YYYY-MM-DD`
- [ ] El modelo `Appointment` tiene el campo `serviceProviderId` de tipo `String` con relación a `ServiceProvider`
- [ ] El modelo `Booking` existe con los campos: `id`, `appointmentId`, `clientName`, `clientPhone`, `status` (enum: `pending`, `confirmed`, `cancelled`), `createdAt`, `updatedAt`
- [ ] El campo `appointmentId` en `Booking` es único (un turno solo puede tener una reserva activa)
- [ ] La migración de Prisma se aplica sin errores en la base de datos existente
- [ ] El cliente de Prisma se regenera correctamente tras la migración

## Pruebas

### Pruebas unitarias

- [ ] El schema de Prisma valida correctamente que `status` solo acepta los valores `pending`, `confirmed`, `cancelled`
- [ ] Al intentar crear dos `Booking` con el mismo `appointmentId`, Prisma lanza error de constraint único

### Pruebas de integración

- [ ] Se puede crear un `Appointment` con `date` y `serviceProviderId` y recuperarlo filtrando por ambos campos
- [ ] Se puede crear un `Booking` asociado a un `Appointment` y consultarlo con `include: { appointment: true }`
- [ ] Al eliminar un `Appointment`, el `Booking` asociado se comporta según la regla de cascada definida
