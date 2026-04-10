# porcion-001 — Migración: modelo ServiceType [BACK]

**Estado:** completada

**Historia de usuario:** HU-5: Gestión de tipos de turno
**Par:** —
**Tipo:** BACK
**Prerequisitos:** Ninguno

## Descripción

Crear el modelo `ServiceType` en el esquema de Prisma y aplicar la migración a la base de datos. El modelo representa un tipo de servicio que ofrece un proveedor, con título, descripción, precio y relación al proveedor. También agregar la relación desde `Appointment` hacia `ServiceType` para poder validar eliminaciones.

## Ejemplo de uso

Un proveedor tiene registrados 3 tipos de turno: "Corte de pelo", "Coloración" y "Barba". Cada uno tiene su propio precio y descripción. Cuando se crea un turno, puede asociarse a uno de estos tipos.

## Criterios de aceptación

- [ ] El modelo `ServiceType` existe en `schema.prisma` con campos: `id`, `title`, `description`, `price`, `serviceProviderId`, `createdAt`, `updatedAt`
- [ ] `ServiceType` tiene relación many-to-one con `ServiceProvider`
- [ ] `Appointment` tiene un campo opcional `serviceTypeId` con relación a `ServiceType`
- [ ] La migración se aplica sin errores en la base de datos
- [ ] El cliente de Prisma se regenera correctamente (`prisma generate`)

## Pruebas

### Pruebas unitarias

- [ ] El modelo `ServiceType` acepta `price` como `Decimal` mayor a cero
- [ ] El campo `serviceProviderId` es obligatorio y referencia a un `ServiceProvider` existente

### Pruebas de integración

- [ ] Se puede insertar un `ServiceType` válido y recuperarlo desde la base de datos
- [ ] Intentar insertar un `ServiceType` sin `serviceProviderId` lanza error de constraint
- [ ] Intentar insertar un `ServiceType` con `serviceProviderId` inexistente lanza error de foreign key
