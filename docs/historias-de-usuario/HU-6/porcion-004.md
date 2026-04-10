# porcion-004 — Generación lazy de turnos en consulta de disponibilidad [BACK]

**Historia de usuario:** HU-6: Configuración de horarios con generación lazy de turnos
**Par:** —
**Tipo:** BACK
**Prerequisitos:** porcion-001, porcion-003

**Estado:** 🔄 En progreso

## Descripción

Modificar los handlers de disponibilidad pública del proveedor para que generen los turnos del mes solicitado en el momento en que un cliente los consulta, si aún no existen en base de datos.

## Ejemplo de uso

Un cliente accede al perfil público de un proveedor y navega al mes de mayo. El sistema detecta que no hay turnos generados para ese mes y proveedor. En ese instante genera todos los slots del mes según la configuración activa, los inserta en base de datos y devuelve los disponibles al cliente. La próxima vez que cualquier cliente consulte mayo, los turnos ya existen y se devuelven directamente sin regenerar.

## Criterios de aceptación

- [ ] `GET /api/p/[slug]/availability?month=YYYY-MM` genera los turnos del mes si no existen para ese proveedor
- [ ] Si los turnos del mes ya existen, no se regeneran; se devuelven los existentes
- [ ] La generación solo ocurre si el proveedor tiene una `ScheduleConfig` activa; si no tiene, responde con lista vacía
- [ ] Los turnos generados respetan `daysOfWeek`, `startTime`, `endTime` e `intervalMinutes` de la config activa
- [ ] No se generan turnos para fechas pasadas dentro del mes solicitado
- [ ] La respuesta solo incluye turnos con `isActive: true` y sin reserva confirmada

## Pruebas

### Pruebas unitarias

- [ ] La función que determina si un mes tiene turnos generados retorna `false` cuando no hay ningún `Appointment` para ese mes y proveedor
- [ ] La función que determina si un mes tiene turnos generados retorna `true` cuando ya existe al menos un `Appointment`
- [ ] El generador de slots para un mes dado con config `09:00-11:00, 60min, [1,2,3,4,5]` produce exactamente 2 slots por día hábil
- [ ] El generador no incluye slots para días del fin de semana cuando `daysOfWeek = [1,2,3,4,5]`
- [ ] El generador omite fechas anteriores a la fecha actual

### Pruebas de integración

- [ ] La primera consulta a `GET /api/p/[slug]/availability?month=2025-07` crea los registros de `Appointment` en base de datos y los devuelve
- [ ] Una segunda consulta al mismo endpoint no duplica los turnos; devuelve los ya existentes
- [ ] Si el proveedor no tiene `ScheduleConfig`, el endpoint responde con `{ slots: [] }` y no lanza error
- [ ] Los turnos con reserva `confirmed` no aparecen en la respuesta de disponibilidad
- [ ] Solicitar un mes pasado devuelve lista vacía sin generar turnos
