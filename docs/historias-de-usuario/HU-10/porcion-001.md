# porcion-001 — Migración: tabla de egresos (`Expense`) [BACK]

**Historia de usuario:** HU-10: Módulo de Finanzas
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno
**Estado:** completada

## Descripción

Crear la tabla `expenses` en la base de datos mediante una migración de Prisma. Esta tabla almacena los egresos manuales que registra el prestador: descripción, monto y a qué prestador pertenece.

## Ejemplo de uso

El prestador carga un egreso "Compra de insumos" por $5000. Ese registro queda guardado en la tabla `expenses` asociado a su cuenta, y puede consultarse para calcular el total de egresos.

## Criterios de aceptación

- [ ] El modelo `Expense` existe en `schema.prisma` con los campos: `id`, `descripcion`, `monto` (Decimal), `serviceProviderId`, `createdAt`, `updatedAt`
- [ ] El modelo tiene relación con `ServiceProvider`
- [ ] La migración se ejecuta sin errores con `npx prisma migrate dev`
- [ ] La tabla `expenses` existe en la base de datos con los índices correctos
- [ ] El cliente de Prisma se regenera y el tipo `Expense` está disponible en el código

## Pruebas

### Pruebas unitarias

- [ ] El modelo acepta un `monto` con decimales (ej: 1500.50)
- [ ] No se puede crear un `Expense` sin `serviceProviderId` (constraint de FK)

### Pruebas de integración

- [ ] Se puede insertar un registro de `Expense` y recuperarlo filtrado por `serviceProviderId`
- [ ] Al eliminar un `ServiceProvider`, sus `expenses` se comportan según la política de cascada definida
