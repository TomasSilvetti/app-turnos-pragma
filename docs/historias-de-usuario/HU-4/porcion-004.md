# porcion-004 — Endpoint: días con disponibilidad por mes [BACK]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** porcion-003
**Tipo:** BACK
**Prerequisitos:** porcion-001

**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Crear el endpoint público que, dado un slug de negocio y un mes/año, devuelve la lista de fechas que tienen al menos un turno activo y sin reserva confirmada. El calendario del frontend (porcion-003) consume este endpoint para saber qué días resaltar.

## Ejemplo de uso

El frontend llama a `GET /api/p/peluqueria-ana/availability?month=2026-04` y recibe `{ dates: ["2026-04-10", "2026-04-11", "2026-04-15"] }`.

## Criterios de aceptación

- [ ] El endpoint `GET /api/p/[slug]/availability` existe y responde sin autenticación
- [ ] Acepta el parámetro de query `month` en formato `YYYY-MM`
- [ ] Retorna únicamente fechas donde exista al menos un `Appointment` con `isActive = true` y sin `Booking` con `status = confirmed`
- [ ] Si el slug no existe, responde con status 404
- [ ] Si el parámetro `month` está ausente o mal formado, responde con status 400
- [ ] La respuesta tiene la forma `{ dates: string[] }` con fechas en formato `YYYY-MM-DD`

## Pruebas

### Pruebas unitarias

- [ ] El servicio retorna solo las fechas con turnos disponibles, excluyendo los que tienen `Booking` confirmado
- [ ] El servicio retorna array vacío si no hay turnos disponibles en el mes
- [ ] El parser de `month` rechaza formatos inválidos y lanza error descriptivo

### Pruebas de integración

- [ ] `GET /api/p/slug-valido/availability?month=2026-04` retorna 200 con la lista de fechas correcta
- [ ] `GET /api/p/slug-inexistente/availability?month=2026-04` retorna 404
- [ ] `GET /api/p/slug-valido/availability` sin `month` retorna 400
- [ ] Un turno con `Booking` de status `confirmed` no aparece en las fechas disponibles aunque su `isActive` sea true
