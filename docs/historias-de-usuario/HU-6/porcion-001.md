# porcion-001 — Migración: daysOfWeek, relación ScheduleConfig↔ServiceType y estado requires_reschedule [BACK]

**Estado:** completada

**Historia de usuario:** HU-6: Configuración de horarios con generación lazy de turnos
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno

## Descripción

Actualizar el esquema de base de datos para soportar los días habilitados en la configuración, la asociación de tipos de turno a una configuración, y el nuevo estado de reserva que indica que requiere reprogramación.

## Ejemplo de uso

Una vez aplicada la migración, el modelo `ScheduleConfig` puede almacenar qué días de la semana están habilitados y qué tipos de turno ofrece. Las reservas pueden marcarse como `requires_reschedule` cuando el proveedor cambia su configuración y algún turno ya reservado desaparece.

## Criterios de aceptación

- [ ] El modelo `ScheduleConfig` tiene el campo `daysOfWeek` (array de enteros, ej: `[1,2,3,4,5]` para L-V)
- [ ] Existe una tabla join `_ScheduleConfigServiceTypes` que relaciona `ScheduleConfig` con `ServiceType` (many-to-many)
- [ ] El enum `BookingStatus` incluye el valor `requires_reschedule`
- [ ] La migración se aplica sin errores en base de datos limpia y en base de datos con datos existentes
- [ ] El campo `daysOfWeek` no puede ser null; si ya hay configs en la tabla, la migración aplica un valor por defecto (`[1,2,3,4,5]`)

## Pruebas

### Pruebas unitarias

- [ ] El schema de Prisma valida que `daysOfWeek` es un array de Int requerido en `ScheduleConfig`
- [ ] El schema de Prisma valida que `BookingStatus` incluye `requires_reschedule`
- [ ] La relación many-to-many entre `ScheduleConfig` y `ServiceType` está correctamente definida en ambos lados del modelo

### Pruebas de integración

- [ ] Se puede crear un `ScheduleConfig` con `daysOfWeek: [1, 3, 5]` y asociarle dos `ServiceType`; al leerlo, ambas relaciones se resuelven correctamente
- [ ] Se puede actualizar el estado de una `Booking` a `requires_reschedule` y persistirlo en base de datos
- [ ] Una `Booking` existente con estado `pending` puede transicionar a `requires_reschedule` sin errores
