# porcion-001 — Migración ScheduleConfig para múltiples configuraciones [BACK]

**Estado:** completada

**Historia de usuario:** HU-8: Configuración de horarios con vista previa de turnos
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno

## Descripción

Modificar la tabla `schedule_configs` en la base de datos para soportar múltiples configuraciones de horario por proveedor. Actualmente solo se permite una configuración por perfil de negocio. Se elimina esa restricción y se agregan los campos `name` (nombre de la configuración) e `isActive` (estado activo/inactivo).

## Ejemplo de uso

Un proveedor puede tener dos configuraciones guardadas: "Lunes a miércoles" (activa) y "Jueves y viernes" (activa), ambas asociadas al mismo perfil de negocio sin conflicto de clave única.

## Criterios de aceptación

- [ ] El campo `businessProfileId` en `schedule_configs` deja de ser único (se elimina la constraint `UNIQUE`)
- [ ] Se agrega el campo `name` de tipo texto no nulo a `schedule_configs`
- [ ] Se agrega el campo `isActive` de tipo booleano con valor por defecto `true` a `schedule_configs`
- [ ] La migración de Prisma se aplica correctamente sin pérdida de datos existentes
- [ ] La relación `BusinessProfile` → `ScheduleConfig` pasa de `scheduleConfig?` (uno a uno) a `scheduleConfigs` (uno a muchos)
- [ ] El cliente de Prisma se regenera y refleja los cambios en los tipos TypeScript

## Pruebas

### Pruebas unitarias

- [ ] Se pueden crear dos registros de `ScheduleConfig` con el mismo `businessProfileId` sin error de base de datos
- [ ] Un registro de `ScheduleConfig` con `isActive = false` se guarda y recupera correctamente
- [ ] El campo `name` es obligatorio: intentar crear un registro sin `name` lanza error de validación

### Pruebas de integración

- [ ] Ejecutar la migración sobre una base de datos con datos existentes no elimina ni corrompe los registros previos de `ScheduleConfig`
- [ ] Después de la migración, `BusinessProfile.scheduleConfigs` devuelve un array (no un objeto único)
- [ ] Los registros previos que no tienen `name` reciben el valor por defecto asignado en la migración (ej: `"Configuración predeterminada"`) sin error
