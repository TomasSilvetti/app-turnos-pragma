# porcion-006 — Server action: crear egreso [BACK]

**Historia de usuario:** HU-10: Módulo de Finanzas
**Par:** porcion-005
**Tipo:** BACK
**Prerequisitos:** porcion-001
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Crear el server action `createExpense` que valida los datos del formulario (descripción y monto) y guarda un nuevo registro en la tabla `expenses` asociado al prestador autenticado. Retorna el egreso creado para que el frontend actualice el listado.

## Ejemplo de uso

El frontend llama a `createExpense({ descripcion: "Compra de insumos", monto: 5000 })`. El servidor valida, guarda en BD y retorna `{ success: true, expense: { id: "...", descripcion: "Compra de insumos", monto: 5000, createdAt: "..." } }`.

## Criterios de aceptación

- [ ] Valida con Zod que `descripcion` sea string no vacío y `monto` sea número positivo mayor a 0
- [ ] Asocia el egreso al `serviceProviderId` del prestador autenticado (desde la sesión de NextAuth)
- [ ] Retorna error si el usuario no está autenticado
- [ ] Retorna error descriptivo si la validación falla
- [ ] Al guardar exitosamente, retorna el registro creado con todos sus campos
- [ ] Llama a `revalidatePath("/dashboard/finanzas")` para invalidar la cache de la página

## Pruebas

### Pruebas unitarias

- [ ] Retorna error de validación si `descripcion` está vacío o es solo espacios
- [ ] Retorna error de validación si `monto` es 0 o negativo
- [ ] Retorna error de autenticación si no hay sesión activa

### Pruebas de integración

- [ ] Llamar a `createExpense` con datos válidos crea un registro en la tabla `expenses` con el `serviceProviderId` correcto
- [ ] El egreso creado no es visible al consultar los datos de otro prestador
- [ ] `revalidatePath` se invoca después de guardar exitosamente
