# porcion-007 — Endpoint de datos del negocio público [BACK]

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** porcion-006
**Tipo:** BACK
**Prerequisitos:** porcion-001
**Estado:** ✅ Completada
**Completada el:** 2026-04-09

## Descripción

Implementar el endpoint público que devuelve los datos del negocio dado su slug. Es consumido por la página pública `/turnos/[slug]` y no requiere autenticación.

## Ejemplo de uso

La página pública llama a `GET /api/public/business/peluqueria-sol` y recibe el nombre, logo, dirección y teléfono del negocio para mostrárselos al cliente visitante.

## Criterios de aceptación

- [ ] El endpoint `GET /api/public/business/[slug]` es accesible sin autenticación
- [ ] Devuelve `{ name, logoUrl, address, phone }` cuando el slug corresponde a un negocio existente
- [ ] Devuelve `404` cuando el slug no corresponde a ningún negocio
- [ ] No expone datos sensibles del prestador (email, hashedPassword, CBU, alias)

## Pruebas

### Pruebas unitarias

- [ ] El servicio devuelve solo los campos públicos (`name`, `logoUrl`, `address`, `phone`) y no incluye campos sensibles
- [ ] El servicio lanza excepción `NotFound` cuando el slug no existe en la base de datos

### Pruebas de integración

- [ ] `GET /api/public/business/peluqueria-sol` devuelve `200` con los datos públicos del negocio
- [ ] `GET /api/public/business/slug-inexistente` devuelve `404`
- [ ] La respuesta no contiene campos sensibles como `cbu`, `alias`, `email` ni `hashedPassword`
- [ ] El endpoint responde correctamente sin header de autorización
