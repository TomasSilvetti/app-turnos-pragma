# porcion-007 — API de previsualización de slots por día [BACK]

**Historia de usuario:** HU-8: Configuración de horarios con vista previa de turnos
**Par:** porcion-006
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Implementar el endpoint que, dado un día del mes, calcula y devuelve los slots de turno que se generarían para ese día según las configuraciones de horario activas del proveedor. Los slots no se persisten en la base de datos: es solo una previsualización. El cálculo toma la configuración activa que cubre ese día de la semana y genera los horarios según el intervalo definido.

## Ejemplo de uso

El frontend hace `GET /api/schedule-configs/preview?date=2026-04-14` (un martes). El servidor busca la configuración activa del proveedor que cubre el martes, y si tiene apertura 09:00, cierre 13:00 e intervalo 30 minutos, responde con un array: `[{time: "09:00"}, {time: "09:30"}, ..., {time: "12:30"}]`.

## Criterios de aceptación

- [ ] `GET /api/schedule-configs/preview?date=YYYY-MM-DD` devuelve los slots del día indicado calculados a partir de las configuraciones activas
- [ ] Si el día de la semana del `date` no está cubierto por ninguna configuración activa, devuelve un array vacío con status `200`
- [ ] Los slots se calculan desde `startTime` hasta `endTime` con el intervalo `intervalMinutes`, sin incluir el slot que igualaría a `endTime`
- [ ] El endpoint solo devuelve slots para configuraciones pertenecientes al proveedor autenticado
- [ ] Si el parámetro `date` está ausente o tiene formato inválido, responde `400` con mensaje de error descriptivo

## Pruebas

### Pruebas unitarias

- [ ] La función de generación de slots con apertura 09:00, cierre 10:00 e intervalo 30 min devuelve exactamente `["09:00", "09:30"]`
- [ ] La función de generación de slots no incluye el horario de cierre en el resultado
- [ ] La función de generación de slots con intervalo que no divide exactamente el rango (ej: 09:00–10:00 con 40 min) genera solo los slots que caben completos
- [ ] Si `startTime` es igual a `endTime`, la función devuelve un array vacío
- [ ] El parser de `date` identifica correctamente el día de la semana (0=domingo, 1=lunes, etc.)

### Pruebas de integración

- [ ] Con una configuración activa que cubre el martes (intervalo 30 min, 09:00–11:00), la llamada con un `date` que sea martes devuelve 4 slots correctos
- [ ] Con dos configuraciones activas que cubren días diferentes, la llamada con un `date` de un día cubierto por la primera config devuelve los slots de esa config y no mezcla con la segunda
- [ ] La llamada con un `date` cuyo día de la semana no está en ninguna configuración activa devuelve `[]`
- [ ] La llamada sin el parámetro `date` devuelve `400`
