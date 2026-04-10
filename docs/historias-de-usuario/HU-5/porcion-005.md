# porcion-005 — Endpoints POST y PUT /api/service-types [BACK]

**Historia de usuario:** HU-5: Gestión de tipos de turno
**Par:** porcion-004
**Tipo:** BACK
**Prerequisitos:** porcion-001

**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Implementar los endpoints para crear (`POST /api/service-types`) y editar (`PUT /api/service-types/[id]`) un tipo de turno. Incluyen validación server-side de los campos requeridos y del precio, y asocian el tipo al proveedor autenticado.

## Ejemplo de uso

El frontend envía `POST /api/service-types` con `{ title: "Corte de pelo", description: "Corte clásico", price: 1500 }` y recibe el objeto creado con su `id`. Para editar, envía `PUT /api/service-types/abc123` con los campos modificados y recibe el objeto actualizado.

## Criterios de aceptación

- [ ] `POST /api/service-types` crea un nuevo tipo y lo asocia al proveedor autenticado
- [ ] `PUT /api/service-types/[id]` actualiza el tipo si pertenece al proveedor autenticado
- [ ] Ambos endpoints validan que `title`, `description` y `price` estén presentes
- [ ] Ambos endpoints devuelven 400 si `price` es cero, negativo o no numérico
- [ ] `PUT` devuelve 404 si el `id` no existe o no pertenece al proveedor autenticado
- [ ] Ambos endpoints devuelven 401 si el usuario no está autenticado
- [ ] La respuesta incluye el objeto completo creado o actualizado

## Pruebas

### Pruebas unitarias

- [ ] El handler de POST devuelve 400 si falta el campo `title`
- [ ] El handler de POST devuelve 400 si `price` es <= 0
- [ ] El handler de PUT devuelve 404 si el `id` pertenece a otro proveedor
- [ ] El handler de PUT devuelve 400 si `price` es texto no numérico

### Pruebas de integración

- [ ] `POST /api/service-types` con datos válidos crea el registro en BD y devuelve 201
- [ ] `PUT /api/service-types/[id]` con datos válidos actualiza el registro en BD y devuelve 200
- [ ] `POST /api/service-types` sin sesión devuelve 401
- [ ] `PUT /api/service-types/[id]` con un id de otro proveedor devuelve 404
