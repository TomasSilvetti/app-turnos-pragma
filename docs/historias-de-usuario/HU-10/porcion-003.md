# porcion-003 — Cards de resumen financiero (Ingresos, Egresos, Balance) — vista [FRONT]

**Historia de usuario:** HU-10: Módulo de Finanzas
**Par:** porcion-004
**Tipo:** FRONT
**Prerequisitos:** porcion-002
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Crear los tres componentes de card que muestran el resumen financiero: Ingresos totales (en verde), Egresos totales (en rojo) y Balance neto (positivo en azul, negativo en rojo). Las cards reciben los valores como props y los formatean como moneda en pesos argentinos.

## Ejemplo de uso

El prestador ve tres cards en la parte superior de la página: "Ingresos $30.000" en verde, "Egresos $0" en rojo y "Balance neto $30.000" en azul. Si los egresos superan a los ingresos, el balance neto se muestra en rojo.

## Criterios de aceptación

- [ ] Se muestran 3 cards: "Ingresos", "Egresos" y "Balance neto"
- [ ] Los montos se formatean como pesos argentinos (ej: `$30.000`)
- [ ] La card "Ingresos" muestra el monto en color verde
- [ ] La card "Egresos" muestra el monto en color rojo
- [ ] La card "Balance neto" muestra el monto en azul si es positivo, en rojo si es negativo o cero
- [ ] Mientras los datos cargan, las cards muestran un estado de skeleton/loading
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] La card "Balance neto" muestra color rojo cuando el balance es 0 o negativo
- [ ] La card "Balance neto" muestra color azul cuando el balance es positivo
- [ ] El monto `30000` se formatea como `$30.000`
- [ ] El monto `0` se muestra como `$0`

### Pruebas de integración

- [ ] Las cards renderizan correctamente cuando se les pasan los valores desde el server action de porcion-004
- [ ] Al actualizar el estado (después de agregar un egreso), las cards reflejan los nuevos valores
