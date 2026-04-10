# porcion-001 — Endpoint: lista de bookings pendientes de reprogramación [BACK]

**Historia de usuario:** HU-7: Reprogramación de clientes con reservas en conflicto
**Par:** porcion-002
**Tipo:** BACK
**Prerequisitos:** Ninguno

## Descripción

Crear el endpoint que devuelve la lista de reservas en estado `requires_reschedule` pertenecientes al proveedor autenticado, incluyendo los datos del cliente y del turno original.

## Ejemplo de uso

El proveedor accede a `/panel/reprogramaciones`. La página llama a `GET /api/panel/reschedules` y recibe un array con los clientes afectados: nombre, teléfono, tipo de turno, fecha y hora del turno original.

## Criterios de aceptación

- [ ] El endpoint `GET /api/panel/reschedules` existe y responde solo a proveedores autenticados
- [ ] Devuelve únicamente las reservas con `status = requires_reschedule` del proveedor autenticado
- [ ] Cada item incluye: `bookingId`, `clientName`, `clientPhone`, `serviceType` (título), `originalDate`, `originalTime`
- [ ] Si no hay reservas pendientes, devuelve un array vacío `[]` con status 200
- [ ] Un proveedor no puede ver las reservas pendientes de otro proveedor

## Pruebas

### Pruebas unitarias

- [ ] El servicio filtra correctamente solo los bookings con `status = requires_reschedule`
- [ ] El servicio filtra por `serviceProviderId` del proveedor autenticado
- [ ] El mapeo de respuesta incluye todos los campos requeridos (clientName, clientPhone, serviceType, originalDate, originalTime)
- [ ] Si no hay bookings pendientes, el servicio devuelve un array vacío

### Pruebas de integración

- [ ] `GET /api/panel/reschedules` sin sesión activa devuelve 401
- [ ] `GET /api/panel/reschedules` con sesión válida devuelve solo los bookings del proveedor autenticado en estado `requires_reschedule`
- [ ] Un proveedor B no puede ver en la respuesta bookings que pertenecen al proveedor A
