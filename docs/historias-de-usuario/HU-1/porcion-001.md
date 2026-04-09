# porcion-001 — Modelo ServiceProvider en Prisma [BACK]

**Estado:** ✅ Completada
**Completada el:** 2026-04-09

**Historia de usuario:** HU-1: Autenticación de prestadores de servicio
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno

## Descripción

Definir el modelo `ServiceProvider` en el schema de Prisma con los campos necesarios para la autenticación y ejecutar la migración para crear la tabla en la base de datos.

## Ejemplo de uso

Después de esta porción, la base de datos tiene la tabla `service_providers` con columnas `id`, `name`, `email` y `hashedPassword`. Otras porciones pueden usar este modelo para crear y consultar prestadores.

## Criterios de aceptación

- [ ] El schema de Prisma incluye el modelo `ServiceProvider` con campos `id`, `name`, `email` y `hashedPassword`
- [ ] El campo `email` tiene restricción de unicidad
- [ ] La migración se ejecuta sin errores y la tabla existe en la base de datos
- [ ] El cliente de Prisma se regenera correctamente (`prisma generate`)

## Pruebas

### Pruebas unitarias

- [ ] El modelo acepta un registro con `name`, `email` y `hashedPassword` válidos y lo persiste correctamente
- [ ] Intentar insertar dos registros con el mismo `email` lanza un error de constraint de unicidad

### Pruebas de integración

- [ ] Ejecutar `prisma migrate dev` completa sin errores en un entorno de desarrollo limpio
- [ ] El cliente Prisma generado expone `prisma.serviceProvider` con los métodos `create`, `findUnique` y `findFirst`
