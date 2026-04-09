---
# porcion-001 — Migración BD: modelos ScheduleConfig y Appointment [BACK]

**Historia de usuario:** HU-3: Configuración de turnos del prestador
**Par:** —
**Tipo:** BACK
**Prerequisitos:** 
**estado**: completada

## Descripción

Agregar al esquema de Prisma los modelos `ScheduleConfig` (configuración horaria del prestador) y `Appointment` (turnos generados), y aplicar la migración a la base de datos.

## Ejemplo de uso

El prestador guarda su configuración y el sistema puede persistir: hora de inicio 08:00, hora de fin 15:00, intervalo 60 min, precio $2000. A partir de eso, los turnos generados (08:00, 09:00, … 14:00) se almacenan en la tabla `appointments`.

## Criterios de aceptación

- [ ] El modelo `ScheduleConfig` existe con los campos: `id`, `startTime` (String), `endTime` (String), `intervalMinutes` (Int), `price` (Decimal), `businessProfileId` (FK única a `BusinessProfile`), `createdAt`, `updatedAt`
- [ ] El modelo `Appointment` existe con los campos: `id`, `time` (String), `isActive` (Boolean, default true), `scheduleConfigId` (FK a `ScheduleConfig`), `createdAt`, `updatedAt`
- [ ] La relación `BusinessProfile` → `ScheduleConfig` es 1 a 1
- [ ] La relación `ScheduleConfig` → `Appointment` es 1 a muchos
- [ ] La migración se aplica sin errores con `prisma migrate dev`
- [ ] El cliente de Prisma se regenera correctamente con los nuevos tipos

## Pruebas

### Pruebas unitarias

- [ ] El modelo `ScheduleConfig` rechaza un registro sin `businessProfileId`
- [ ] El modelo `Appointment` rechaza un registro sin `scheduleConfigId`
- [ ] El campo `isActive` toma `true` como valor por defecto al crear un `Appointment`
- [ ] El campo `price` acepta valores decimales (ej: 1500.50) y rechaza valores negativos a nivel de negocio

### Pruebas de integración

- [ ] Se puede crear un `ScheduleConfig` asociado a un `BusinessProfile` existente y leerlo correctamente
- [ ] Se pueden crear múltiples `Appointment` asociados a un `ScheduleConfig` y recuperarlos mediante la relación
- [ ] Intentar crear un segundo `ScheduleConfig` para el mismo `BusinessProfile` lanza un error de constraint único
