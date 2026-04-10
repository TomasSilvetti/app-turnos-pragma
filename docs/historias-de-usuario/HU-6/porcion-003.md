# porcion-003 — Endpoint guardar/actualizar configuración + lógica de regeneración [BACK]

**Historia de usuario:** HU-6: Configuración de horarios con generación lazy de turnos
**Par:** porcion-002
**Tipo:** BACK
**Prerequisitos:** porcion-001

**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Implementar el endpoint que persiste la configuración de horarios del proveedor. Si es la primera vez, guarda sin generar turnos. Si ya existe una configuración, borra los turnos ya generados (sin reserva activa), regenera los del mismo mes con la nueva config, y marca como `requires_reschedule` las reservas cuyos turnos desaparecen con la nueva configuración.

## Ejemplo de uso

El proveedor guarda su configuración con L-V, 09:00-18:00, cada 30 min y dos tipos de turno. El endpoint valida, persiste la config y responde con éxito. Si modifica y ya tenía turnos del mes actual generados, esos turnos se eliminan y se vuelven a crear con los nuevos parámetros. Si algún turno eliminado tenía una reserva, esa reserva queda en estado `requires_reschedule`.

## Criterios de aceptación

- [ ] `POST /api/panel/schedule-config` crea una configuración nueva y responde 201 si no existía previamente
- [ ] `PUT /api/panel/schedule-config` actualiza la configuración existente y responde 200
- [ ] El endpoint valida que `endTime > startTime`; si no, responde 422 con mensaje de error claro
- [ ] El endpoint valida que se envíe al menos un `serviceTypeId`; si no, responde 422
- [ ] El endpoint valida que se envíe al menos un día en `daysOfWeek`; si no, responde 422
- [ ] El endpoint valida que los `serviceTypeId` recibidos pertenecen al proveedor autenticado
- [ ] Al actualizar, los turnos sin reserva de los meses ya generados se eliminan y se regeneran con la nueva config
- [ ] Al actualizar, las reservas activas cuyos turnos desaparecen con la nueva config quedan en estado `requires_reschedule`
- [ ] La respuesta del `PUT` incluye el conteo de reservas afectadas (`affectedBookings: number`)
- [ ] Solo el proveedor autenticado puede modificar su propia configuración (no puede modificar la de otro)

## Contrato de la API

**Request body (POST y PUT):**
```json
{
  "startTime": "09:00",
  "endTime": "18:00",
  "intervalMinutes": 30,
  "daysOfWeek": [1, 2, 3, 4, 5],
  "serviceTypeIds": ["cuid1", "cuid2"]
}
```

**Response 201/200:**
```json
{
  "id": "cuid",
  "startTime": "09:00",
  "endTime": "18:00",
  "intervalMinutes": 30,
  "daysOfWeek": [1, 2, 3, 4, 5],
  "serviceTypes": [{ "id": "cuid1", "title": "Corte" }],
  "affectedBookings": 0
}
```

## Pruebas

### Pruebas unitarias

- [ ] La función de validación rechaza `endTime <= startTime`
- [ ] La función de validación rechaza `daysOfWeek` vacío
- [ ] La función de validación rechaza `serviceTypeIds` vacío
- [ ] La función de regeneración de turnos genera correctamente los slots para un mes dado según `startTime`, `endTime`, `intervalMinutes` y `daysOfWeek`
- [ ] La función de regeneración no genera slots para días no incluidos en `daysOfWeek`
- [ ] La función de regeneración no genera slots fuera del rango de horas configurado

### Pruebas de integración

- [ ] `POST` crea config y no genera ningún `Appointment` en base de datos
- [ ] `PUT` con meses previamente generados elimina los turnos sin reserva y crea los nuevos
- [ ] `PUT` cuando hay reservas en turnos que desaparecen, esas reservas quedan con `status: requires_reschedule`
- [ ] `PUT` devuelve `affectedBookings: 2` cuando hay 2 reservas afectadas
- [ ] Un proveedor B no puede hacer `PUT` sobre la config del proveedor A (responde 403)
- [ ] Enviar `serviceTypeIds` de otro proveedor responde 422
