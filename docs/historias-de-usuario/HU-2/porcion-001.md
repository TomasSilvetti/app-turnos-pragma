# porcion-001 — Migración: modelo BusinessProfile [BACK]

**Estado:** completada

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno

## Descripción

Crear el modelo `BusinessProfile` en la base de datos, asociado a un `ServiceProvider`, con los campos necesarios para almacenar el perfil del negocio: nombre, URL del logo, dirección, teléfono, CBU, alias y slug único para el link público.

## Ejemplo de uso

Después de aplicar la migración, la base de datos tiene una tabla `business_profiles` con todos los campos del perfil. Cuando se crea un negocio llamado "Peluquería Sol", se genera un slug `peluqueria-sol` que será parte de su link público.

## Criterios de aceptación

- [ ] El modelo `BusinessProfile` existe en el schema de Prisma con los campos: `id`, `name`, `logoUrl`, `address`, `phone`, `cbu`, `alias`, `slug`, `serviceProviderId`, `createdAt`, `updatedAt`
- [ ] El campo `slug` es único a nivel de base de datos
- [ ] El campo `serviceProviderId` es único (relación 1 a 1 con `ServiceProvider`)
- [ ] La migración se aplica sin errores sobre la base de datos existente
- [ ] El modelo `ServiceProvider` tiene la relación inversa con `BusinessProfile` declarada en el schema

## Pruebas

### Pruebas unitarias

- [ ] El schema de Prisma valida que `slug` tiene constraint `@unique`
- [ ] El schema de Prisma valida que `serviceProviderId` tiene constraint `@unique` (relación 1 a 1)
- [ ] Intentar insertar dos `BusinessProfile` con el mismo `slug` lanza error de constraint único

### Pruebas de integración

- [ ] Ejecutar `prisma migrate dev` aplica la migración sin errores y la tabla `business_profiles` existe con todas las columnas esperadas
- [ ] Crear un `BusinessProfile` asociado a un `ServiceProvider` existente persiste correctamente en la base de datos
- [ ] Intentar crear un segundo `BusinessProfile` para el mismo `ServiceProvider` lanza error de constraint único
