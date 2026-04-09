---
# porcion-003 — Endpoint guardar configuración y generar turnos [BACK]

**Historia de usuario:** HU-3: Configuración de turnos del prestador
**Par:** porcion-002
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Implementar el endpoint que recibe la configuración del prestador, la valida en el servidor, la persiste en `ScheduleConfig` y genera automáticamente todos los `Appointment` dentro del rango horario indicado. Si ya existía una configuración previa, la reemplaza y regenera los turnos.

## Ejemplo de uso

El prestador envía: `{ startTime: "08:00", endTime: "15:00", intervalMinutes: 60, price: 2000 }`. El endpoint valida, guarda la config y genera los turnos 08:00, 09:00, 10:00, 11:00, 12:00, 13:00 y 14:00, devolviendo la lista de turnos creados.

## Criterios de aceptación

- [ ] `POST /api/schedule-config` recibe los cuatro campos y los persiste en `ScheduleConfig` asociado al prestador autenticado
- [ ] El endpoint genera automáticamente los `Appointment` correspondientes dentro del rango con el intervalo dado
- [ ] Si ya existe una `ScheduleConfig` para el prestador, se actualiza y los turnos anteriores se reemplazan por los nuevos (los turnos viejos se eliminan o desactivan antes de crear los nuevos)
- [ ] El endpoint valida server-side: campos obligatorios presentes, hora de fin > hora de inicio, precio > 0, intervalo entero positivo
- [ ] Si la validación falla, retorna `400` con un mensaje que indica qué campo es inválido y por qué
- [ ] Solo un prestador autenticado puede llamar a este endpoint; sin sesión válida retorna `401`
- [ ] La respuesta exitosa (`201` o `200`) incluye la config guardada y la lista de turnos generados

## Pruebas

### Pruebas unitarias

- [ ] La función de generación de slots produce la lista correcta dado startTime, endTime e intervalMinutes (ej: 08:00–10:00 cada 30 min → 08:00, 08:30, 09:00, 09:30)
- [ ] La función de generación no produce el turno igual a endTime (el rango es inicio ≤ slot < fin)
- [ ] La validación server-side retorna error si hora de fin ≤ hora de inicio
- [ ] La validación server-side retorna error si precio ≤ 0
- [ ] La validación server-side retorna error si intervalo ≤ 0 o no es entero
- [ ] Si el intervalo no divide exactamente el rango, se generan solo los slots que caben dentro del horario

### Pruebas de integración

- [ ] Un `POST` válido crea la `ScheduleConfig` y los `Appointment` en la BD y retorna `201`
- [ ] Un segundo `POST` para el mismo prestador reemplaza la config anterior y regenera los turnos; la BD no conserva los turnos viejos
- [ ] Un `POST` sin sesión retorna `401`
- [ ] Un `POST` con `endTime` ≤ `startTime` retorna `400` con mensaje descriptivo
