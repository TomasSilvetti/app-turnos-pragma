# porcion-001 — API disponibilidad pública: incluir turnos reservados y serviceTypes [BACK]

**Historia de usuario:** HU-9
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno
**Estado:** completada

## Descripción

Modificar `GET /api/p/[slug]/availability` para que devuelva también los turnos con booking confirmado (marcados como `booked: true`) y los tipos de turno asociados a cada scheduleConfig.

Actualmente la query filtra los appointments con booking confirmado antes de devolverlos, por lo que el frontend nunca los ve. Se necesita cambiar eso para que lleguen al cliente con un flag que indique su estado.

Además, cada slot debe incluir los `serviceTypes` del scheduleConfig al que pertenece, para que el modal de reserva pueda mostrarlos.

## Cambios

**Archivo:** `src/app/api/p/[slug]/availability/route.ts`

1. En el `findMany` de appointments, eliminar el filtro `OR booking is null / status not confirmed`.
2. Agregar `include` del scheduleConfig con sus `serviceTypes` (id, title, price).
3. En el mapeo de respuesta, agregar el campo `booked: boolean` (true si tiene booking con status "confirmed") y el campo `serviceTypes: { id, title, price }[]`.

## Ejemplo de respuesta esperada

```json
{
  "slots": [
    {
      "id": "abc123",
      "date": "2026-04-10",
      "time": "09:00",
      "price": 5000,
      "booked": false,
      "serviceTypes": [
        { "id": "st1", "title": "Consulta general", "price": 5000 },
        { "id": "st2", "title": "Control de seguimiento", "price": 3500 }
      ]
    },
    {
      "id": "def456",
      "date": "2026-04-10",
      "time": "09:30",
      "price": 5000,
      "booked": true,
      "serviceTypes": [...]
    }
  ]
}
```

## Criterios de aceptación

- [ ] El endpoint devuelve todos los appointments (disponibles y reservados) del mes solicitado
- [ ] Los slots con booking confirmado tienen `booked: true`
- [ ] Los slots sin booking o con status distinto a confirmed tienen `booked: false`
- [ ] Cada slot incluye el array `serviceTypes` con `id`, `title` y `price` del scheduleConfig asociado
- [ ] Los slots con `booked: true` ya no se regeneran (la lógica de delete/recreate solo afecta a los no confirmados, lo que ya estaba correcto)

## Pruebas

- [ ] GET con un mes que tiene turnos libres y reservados devuelve ambos tipos con el flag correcto
- [ ] GET con un mes sin turnos reservados devuelve todos con `booked: false`
- [ ] Los `serviceTypes` del slot corresponden al scheduleConfig del appointment, no a todos los service types del negocio
