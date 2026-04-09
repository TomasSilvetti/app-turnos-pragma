# porcion-005 — Endpoint de verificación de perfil completo [BACK]

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** porcion-004
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Implementar el endpoint que indica si el prestador autenticado ya tiene un perfil de negocio configurado. Es consumido por el guard de redirección del frontend para decidir si mostrar el panel o redirigir al formulario de perfil.

## Ejemplo de uso

Al iniciar sesión, el frontend llama a `GET /api/business-profile/status`. Si el prestador tiene perfil, el endpoint devuelve `{ hasProfile: true, slug: "peluqueria-sol" }`. Si no, devuelve `{ hasProfile: false }` y el frontend redirige al formulario.

## Criterios de aceptación

- [ ] El endpoint `GET /api/business-profile/status` devuelve `{ hasProfile: true, slug: string }` si el prestador tiene perfil configurado
- [ ] El endpoint devuelve `{ hasProfile: false }` si el prestador no tiene perfil configurado
- [ ] Solo el prestador autenticado puede consultar su propio estado; sin sesión devuelve `401`
- [ ] La respuesta incluye el slug solo cuando `hasProfile` es `true`

## Pruebas

### Pruebas unitarias

- [ ] El servicio devuelve `{ hasProfile: false }` cuando no existe `BusinessProfile` para el prestador
- [ ] El servicio devuelve `{ hasProfile: true, slug: "..." }` cuando existe `BusinessProfile` para el prestador
- [ ] El endpoint rechaza requests sin token de sesión con `401`

### Pruebas de integración

- [ ] Llamar al endpoint con un prestador sin perfil devuelve `200` con `{ hasProfile: false }`
- [ ] Llamar al endpoint con un prestador que tiene perfil devuelve `200` con `{ hasProfile: true, slug: "..." }`
- [ ] Llamar al endpoint sin autenticación devuelve `401`
