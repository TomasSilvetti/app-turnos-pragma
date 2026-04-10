# porcion-006 — Endpoint: turnos disponibles por slug y fecha [BACK]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** porcion-005
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Crear el endpoint público que, dado un slug de negocio y una fecha, devuelve los turnos activos y sin reserva confirmada para ese día. Las cards del frontend (porcion-005) consumen este endpoint.

## Ejemplo de uso

El frontend llama a `GET /api/p/peluqueria-ana/appointments?date=2026-04-15` y recibe la lista de turnos disponibles: `[{ id, time, price }]`.

## Criterios de aceptación

- [ ] El endpoint `GET /api/p/[slug]/appointments` existe y responde sin autenticación
- [ ] Acepta el parámetro de query `date` en formato `YYYY-MM-DD`
- [ ] Retorna solo los `Appointment` con `isActive = true` y sin `Booking` con `status = confirmed` para esa fecha y ese slug
- [ ] Cada elemento de la respuesta incluye `id`, `time` y `price`
- [ ] Si el slug no existe, responde con status 404
- [ ] Si el parámetro `date` está ausente o mal formado, responde con status 400
- [ ] La respuesta tiene la forma `{ appointments: { id: string, time: string, price: number }[] }`

## Pruebas

### Pruebas unitarias

- [ ] El servicio excluye turnos con `isActive = false`
- [ ] El servicio excluye turnos que tienen un `Booking` con `status = confirmed`
- [ ] El servicio incluye turnos que tienen `Booking` con `status = cancelled` o `pending`

### Pruebas de integración

- [ ] `GET /api/p/slug-valido/appointments?date=2026-04-15` retorna 200 con los turnos correctos
- [ ] `GET /api/p/slug-inexistente/appointments?date=2026-04-15` retorna 404
- [ ] `GET /api/p/slug-valido/appointments` sin `date` retorna 400
- [ ] Un turno recién reservado (status `confirmed`) no aparece en la respuesta
