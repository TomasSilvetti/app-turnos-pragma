# porcion-007 — Middleware de protección de rutas /panel [BACK]

**Historia de usuario:** HU-1: Autenticación de prestadores de servicio
**Par:** —
**Tipo:** BACK
**Prerequisitos:** porcion-002

## Descripción

Implementar el middleware de Next.js que intercepta cualquier acceso a rutas bajo `/panel` y redirige automáticamente a `/login` si el prestador no tiene sesión activa.

## Ejemplo de uso

Un prestador no autenticado intenta navegar directamente a `/panel/turnos`. El middleware detecta que no hay sesión, cancela la navegación y redirige a `/login`. Un prestador con sesión activa accede sin interrupciones.

## Criterios de aceptación

- [ ] Cualquier ruta bajo `/panel/*` redirige a `/login` si no hay sesión activa de NextAuth
- [ ] Un usuario con sesión activa puede acceder a cualquier ruta bajo `/panel` sin ser redirigido
- [ ] Las rutas públicas (`/login`, `/register`, y raíz `/`) no son bloqueadas por el middleware
- [ ] La redirección preserva la URL original como parámetro `callbackUrl` para volver después del login (si se desea implementar en el futuro)

## Pruebas

### Pruebas unitarias

- [ ] El middleware redirige a `/login` cuando `auth()` devuelve `null` para una ruta `/panel/*`
- [ ] El middleware no redirige cuando `auth()` devuelve una sesión válida para una ruta `/panel/*`
- [ ] El middleware no interviene en rutas fuera de `/panel` (ej: `/login`, `/register`)

### Pruebas de integración

- [ ] `GET /panel` sin cookies de sesión responde con redirección 302 a `/login`
- [ ] `GET /panel/cualquier-subruta` sin sesión responde con redirección 302 a `/login`
- [ ] `GET /panel` con una sesión válida en las cookies responde con status 200
