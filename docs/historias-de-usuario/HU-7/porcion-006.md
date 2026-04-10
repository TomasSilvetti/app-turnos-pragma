# porcion-006 — Endpoint: conteo de bookings pendientes de reprogramación [BACK]

**Estado:** 🔄 En progreso

**Historia de usuario:** HU-7: Reprogramación de clientes con reservas en conflicto
**Par:** porcion-005
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Crear el endpoint que devuelve la cantidad de reservas en estado `requires_reschedule` del proveedor autenticado. Es el dato que consume el badge del menú lateral.

## Ejemplo de uso

El menú lateral llama a `GET /api/panel/reschedules/count` y recibe `{ "count": 3 }`. Con ese valor muestra el badge. Si recibe `{ "count": 0 }`, oculta el badge.

## Criterios de aceptación

- [ ] El endpoint `GET /api/panel/reschedules/count` existe y responde solo a proveedores autenticados
- [ ] Devuelve `{ "count": N }` donde N es el número de bookings con `status = requires_reschedule` del proveedor autenticado
- [ ] Devuelve `{ "count": 0 }` cuando no hay pendientes
- [ ] Un proveedor no puede ver el conteo de otro proveedor

## Pruebas

### Pruebas unitarias

- [ ] El servicio cuenta correctamente los bookings con `status = requires_reschedule` del proveedor autenticado
- [ ] Devuelve 0 cuando no hay bookings pendientes
- [ ] Filtra por `serviceProviderId` del proveedor autenticado (no devuelve datos de otros proveedores)

### Pruebas de integración

- [ ] `GET /api/panel/reschedules/count` sin sesión activa devuelve 401
- [ ] Con sesión válida, devuelve el conteo correcto de bookings en `requires_reschedule`
- [ ] Tras confirmar una reprogramación (`POST /api/panel/reschedules`), el conteo disminuye en 1
