# porcion-007 — Listado de ingresos automáticos (turnos cobrados) — vista [FRONT]

**Historia de usuario:** HU-10: Módulo de Finanzas
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-003, porcion-004
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Crear la sección "INGRESOS — TURNOS CONFIRMADOS" que muestra el listado de turnos que ya fueron cobrados (confirmados con horario pasado). Cada fila muestra el horario y fecha del turno, el nombre del cliente y el monto en verde. Los datos vienen del server action de porcion-004.

## Ejemplo de uso

El prestador ve la sección con el título "INGRESOS — TURNOS CONFIRMADOS". Debajo aparece una fila: "11:00 · Vie 10 abr / gaston silvetti · 2 pers." con el monto "+$30.000" en verde a la derecha.

## Criterios de aceptación

- [ ] La sección muestra el título "INGRESOS — TURNOS CONFIRMADOS" en mayúsculas
- [ ] Cada fila del listado muestra: hora y fecha formateada (ej: "11:00 · Vie 10 abr"), nombre del cliente y monto positivo en verde (ej: `+$30.000`)
- [ ] Si no hay ingresos, la sección no muestra ningún item (o muestra un estado vacío discreto)
- [ ] Los items se ordenan del más reciente al más antiguo
- [ ] El monto se formatea como pesos argentinos con separador de miles
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Una fecha como `"2026-04-10"` con hora `"11:00"` se formatea como `"11:00 · Vie 10 abr"`
- [ ] El monto `30000` se muestra como `+$30.000` en color verde
- [ ] Con lista vacía el componente renderiza sin errores

### Pruebas de integración

- [ ] El listado muestra exactamente los ingresos retornados por `getFinancialSummary` de porcion-004
- [ ] Al agregarse un nuevo egreso (y actualizarse el estado), el listado de ingresos permanece sin cambios (no se mezclan los datos)
