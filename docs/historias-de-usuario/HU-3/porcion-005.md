---
# porcion-005 — Endpoints desactivar y eliminar turno [BACK]

**Historia de usuario:** HU-3: Configuración de turnos del prestador
**Par:** porcion-004
**Tipo:** BACK
**Prerequisitos:** porcion-001, porcion-003
**Estado:** completado

## Descripción

Implementar los endpoints para que el prestador pueda desactivar (toggle) o eliminar permanentemente un turno individual identificado por su `id`.

## Ejemplo de uso

El prestador hace clic en "Desactivar" sobre el turno de las 10:00. El frontend llama a `PATCH /api/appointments/:id/toggle`. El turno queda con `isActive: false` en la BD y deja de ser visible para los clientes. Si hace clic en "Eliminar" y confirma, se llama a `DELETE /api/appointments/:id` y el turno desaparece permanentemente.

## Criterios de aceptación

- [ ] `PATCH /api/appointments/:id/toggle` invierte el valor de `isActive` del turno indicado y retorna el turno actualizado
- [ ] `DELETE /api/appointments/:id` elimina el turno de forma permanente de la BD y retorna `204`
- [ ] Ambos endpoints solo permiten operar sobre turnos que pertenezcan al prestador autenticado; si el turno es de otro prestador, retornan `403`
- [ ] Si el `id` no corresponde a ningún turno existente, ambos endpoints retornan `404`
- [ ] Sin sesión válida, ambos endpoints retornan `401`
- [ ] Un turno desactivado (`isActive: false`) no se incluye en las consultas públicas de disponibilidad para clientes

## Pruebas

### Pruebas unitarias

- [ ] El handler de toggle cambia `isActive` de `true` a `false` y viceversa
- [ ] El handler de delete no lanza error si el `id` existe y pertenece al prestador
- [ ] El servicio retorna `404` si el `id` no existe en la BD
- [ ] El servicio retorna `403` si el turno pertenece a otro prestador

### Pruebas de integración

- [ ] `PATCH /api/appointments/:id/toggle` con turno activo lo desactiva y retorna `{ isActive: false }`
- [ ] `PATCH /api/appointments/:id/toggle` aplicado dos veces al mismo turno lo deja en su estado original
- [ ] `DELETE /api/appointments/:id` elimina el turno; una consulta posterior con ese `id` retorna `404`
- [ ] `PATCH` o `DELETE` sin sesión retornan `401`
- [ ] `PATCH` o `DELETE` sobre turno de otro prestador retornan `403`
