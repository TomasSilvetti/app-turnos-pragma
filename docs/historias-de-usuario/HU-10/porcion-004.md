# porcion-004 — Server action: calcular ingresos y egresos [BACK]

**Historia de usuario:** HU-10: Módulo de Finanzas
**Par:** porcion-003
**Tipo:** BACK
**Prerequisitos:** porcion-001
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Crear el server action `getFinancialSummary` que calcula y retorna el total de ingresos (turnos confirmados con horario pasado), el total de egresos (registros manuales) y el balance neto. También retorna el detalle de cada ingreso para alimentar el listado de movimientos.

## Ejemplo de uso

La página de Finanzas llama a `getFinancialSummary()` y recibe: `{ totalIngresos: 30000, totalEgresos: 0, balanceNeto: 30000, ingresos: [{ hora: "11:00", fecha: "2026-04-10", clienteNombre: "Gaston Silvetti", monto: 30000 }], egresos: [] }`.

## Criterios de aceptación

- [ ] Solo retorna datos del prestador autenticado (usa la sesión de NextAuth)
- [ ] Un turno cuenta como ingreso si: `Booking.status = "confirmed"` y la combinación `Appointment.date + Appointment.time` es anterior al momento actual
- [ ] El monto del ingreso se toma de `ServiceType.price` asociado al `Appointment`
- [ ] Si el turno no tiene `ServiceType`, se omite o se trata como $0 (documentar la decisión)
- [ ] Los egresos se obtienen de la tabla `expenses` filtrados por `serviceProviderId`
- [ ] El `balanceNeto` es `totalIngresos - totalEgresos`
- [ ] La función retorna un objeto con: `totalIngresos`, `totalEgresos`, `balanceNeto`, `ingresos[]`, `egresos[]`

## Pruebas

### Pruebas unitarias

- [ ] Un turno con `Booking.status = "confirmed"` y fecha pasada se incluye en ingresos
- [ ] Un turno con `Booking.status = "confirmed"` y fecha futura NO se incluye en ingresos
- [ ] Un turno con `Booking.status = "pending"` NO se incluye en ingresos aunque su fecha pasó
- [ ] El `balanceNeto` es negativo cuando los egresos superan a los ingresos

### Pruebas de integración

- [ ] El server action retorna solo los datos del prestador autenticado, nunca de otros prestadores
- [ ] Con 2 turnos cobrados de $15.000 cada uno y 1 egreso de $5.000, retorna `totalIngresos: 30000`, `totalEgresos: 5000`, `balanceNeto: 25000`
