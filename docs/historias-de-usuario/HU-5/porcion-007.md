# porcion-007 — Endpoint DELETE /api/service-types con validación de reservas [BACK]

**Historia de usuario:** HU-5: Gestión de tipos de turno
**Par:** porcion-006
**Tipo:** BACK
**Prerequisitos:** porcion-001

**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Implementar el endpoint `DELETE /api/service-types/[id]` que elimina un tipo de turno solo si no tiene reservas futuras activas. Si las tiene, devuelve un error descriptivo. Si no las tiene, elimina el registro de la base de datos.

## Ejemplo de uso

El frontend llama a `DELETE /api/service-types/abc123`. Si el tipo tiene turnos futuros con bookings activos (status `pending` o `confirmed`), el backend responde 409 con `{ error: "No podés eliminar este tipo de turno porque tiene reservas futuras. Cancelalas primero." }`. Si no tiene reservas activas, responde 200 y el tipo queda eliminado.

## Criterios de aceptación

- [ ] `DELETE /api/service-types/[id]` elimina el tipo si no tiene reservas futuras activas
- [ ] Si el tipo tiene `Appointment`s futuros con `Booking` en status `pending` o `confirmed`, devuelve 409 con mensaje descriptivo
- [ ] Devuelve 404 si el `id` no existe o no pertenece al proveedor autenticado
- [ ] Devuelve 401 si el usuario no está autenticado
- [ ] "Reservas futuras" se determina comparando la fecha del `Appointment` con la fecha actual

## Pruebas

### Pruebas unitarias

- [ ] El handler devuelve 409 si existen `Booking`s con status `pending` en turnos futuros del tipo
- [ ] El handler devuelve 409 si existen `Booking`s con status `confirmed` en turnos futuros del tipo
- [ ] El handler permite eliminar si solo existen `Booking`s con status `cancelled` o turnos pasados
- [ ] El handler devuelve 404 si el `id` pertenece a otro proveedor

### Pruebas de integración

- [ ] `DELETE /api/service-types/[id]` sin reservas activas elimina el registro y devuelve 200
- [ ] `DELETE /api/service-types/[id]` con reservas futuras activas devuelve 409 y el registro sigue en BD
- [ ] `DELETE /api/service-types/[id]` sin sesión devuelve 401
- [ ] `DELETE /api/service-types/[id]` con id inexistente devuelve 404
