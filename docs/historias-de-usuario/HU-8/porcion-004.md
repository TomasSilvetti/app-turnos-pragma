# porcion-004 — API CRUD de configuraciones de horario y validación de conflictos [BACK]

**Historia de usuario:** HU-8: Configuración de horarios con vista previa de turnos
**Par:** porcion-003
**Tipo:** BACK
**Prerequisitos:** porcion-001

**Estado:** completada

## Descripción

Implementar los endpoints para crear, leer, editar, eliminar y cambiar el estado activo/inactivo de las configuraciones de horario. Incluye la validación de conflictos: cuando se intenta activar una configuración, el servidor verifica que ninguno de sus días habilitados esté ya cubierto por otra configuración activa del mismo proveedor; si hay conflicto, devuelve un error con los días en conflicto.

## Ejemplo de uso

El frontend hace `POST /api/schedule-configs` con los datos del formulario y recibe la configuración creada. Al hacer `PATCH /api/schedule-configs/:id/toggle`, el servidor comprueba si activar esa configuración generaría un conflicto de días con otra ya activa; si hay conflicto, responde con `409 Conflict` e indica los días problemáticos. Si no hay conflicto, actualiza `isActive` y responde con `200 OK`.

## Criterios de aceptación

- [ ] `GET /api/schedule-configs` devuelve todas las configuraciones del proveedor autenticado con sus tipos de turno asociados
- [ ] `POST /api/schedule-configs` crea una nueva configuración y la devuelve con status `201`
- [ ] `PUT /api/schedule-configs/:id` actualiza una configuración existente y la devuelve con status `200`
- [ ] `DELETE /api/schedule-configs/:id` elimina la configuración y responde con status `204`
- [ ] `PATCH /api/schedule-configs/:id/toggle` activa o desactiva la configuración; si al activar hay conflicto de días con otra configuración activa, responde `409` con el mensaje de error y los días en conflicto
- [ ] Todos los endpoints validan que la configuración pertenece al proveedor autenticado antes de operar; si no pertenece, responden `403`
- [ ] Los campos obligatorios (name, startTime, endTime, intervalMinutes, daysOfWeek) se validan en el servidor; si faltan, responde `400` con detalle del error

## Pruebas

### Pruebas unitarias

- [ ] La función de detección de conflictos retorna los días solapados cuando dos arrays de `daysOfWeek` comparten valores
- [ ] La función de detección de conflictos retorna vacío cuando los arrays no comparten valores
- [ ] La validación de campos obligatorios lanza error cuando `daysOfWeek` es un array vacío
- [ ] La validación rechaza configuraciones donde `startTime >= endTime`

### Pruebas de integración

- [ ] `POST /api/schedule-configs` con datos válidos crea el registro en la base de datos y lo devuelve con `id` generado
- [ ] `PATCH /api/schedule-configs/:id/toggle` sobre una configuración con días que ya están en otra configuración activa responde `409` con los días en conflicto explícitos
- [ ] `PATCH /api/schedule-configs/:id/toggle` sobre una configuración sin conflicto actualiza `isActive` correctamente en la base de datos
- [ ] `DELETE /api/schedule-configs/:id` con un id que no pertenece al proveedor autenticado responde `403` y no elimina el registro
- [ ] `GET /api/schedule-configs` no devuelve configuraciones de otros proveedores
