# porcion-004 — POST booking: persistir serviceTypeId [BACK]

**Historia de usuario:** HU-9
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno (puede desarrollarse en paralelo con 001-003)
**Estado:** pendiente

## Descripción

Actualizar `POST /api/public/bookings` para aceptar y persistir el `serviceTypeId` en el appointment al momento de crear la reserva.

Actualmente el endpoint crea la booking pero no actualiza el `serviceTypeId` del appointment. La relación `Appointment.serviceTypeId` ya existe en el schema de Prisma.

## Cambios

**Archivo:** `src/app/api/public/bookings/route.ts`

1. Extraer `serviceTypeId` del body (opcional, puede ser null).
2. Si se recibe `serviceTypeId`, verificar que el ServiceType exista y pertenezca al mismo ServiceProvider del appointment (validación de seguridad).
3. Al crear/actualizar la booking, también actualizar `appointment.serviceTypeId` con el valor recibido.

## Criterios de aceptación

- [ ] El endpoint acepta `serviceTypeId` como campo opcional en el body
- [ ] Si se envía `serviceTypeId`, el appointment queda con ese valor asociado
- [ ] Si no se envía `serviceTypeId`, el appointment no cambia su `serviceTypeId` (backward compatible)
- [ ] Si se envía un `serviceTypeId` inválido (no existe o no pertenece al proveedor), el endpoint responde 400

## Pruebas

- [ ] POST sin `serviceTypeId` crea la booking correctamente (backward compatibility)
- [ ] POST con `serviceTypeId` válido crea la booking y actualiza el appointment
- [ ] POST con `serviceTypeId` inexistente responde 400
