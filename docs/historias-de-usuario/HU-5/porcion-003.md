# porcion-003 — Endpoint GET /api/service-types [BACK]

**Historia de usuario:** HU-5: Gestión de tipos de turno
**Par:** porcion-002
**Tipo:** BACK
**Prerequisitos:** porcion-001

**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Implementar el endpoint `GET /api/service-types` que devuelve la lista de tipos de turno del proveedor autenticado. La página del listado (porcion-002) consume este endpoint para mostrar los datos reales.

## Ejemplo de uso

El frontend hace `GET /api/service-types` y recibe un array con los tipos de turno del proveedor autenticado: `[{ id, title, description, price }]`. Si no tiene ninguno, devuelve un array vacío.

## Criterios de aceptación

- [ ] `GET /api/service-types` devuelve los tipos de turno del proveedor autenticado
- [ ] La respuesta incluye los campos: `id`, `title`, `description`, `price`
- [ ] Si el proveedor no tiene tipos creados, devuelve un array vacío con status 200
- [ ] Si el usuario no está autenticado, devuelve 401
- [ ] Los resultados solo corresponden al proveedor autenticado, no a otros proveedores

## Pruebas

### Pruebas unitarias

- [ ] El handler devuelve solo los `ServiceType` del proveedor autenticado
- [ ] El handler devuelve 401 si no hay sesión activa

### Pruebas de integración

- [ ] `GET /api/service-types` con sesión válida devuelve los tipos del proveedor en la BD
- [ ] `GET /api/service-types` sin sesión devuelve 401
- [ ] Un proveedor no puede ver los tipos de turno de otro proveedor
