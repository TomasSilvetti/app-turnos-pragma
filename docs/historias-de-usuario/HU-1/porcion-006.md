# porcion-006 — Endpoint de login con NextAuth Credentials [BACK]

**Historia de usuario:** HU-1: Autenticación de prestadores de servicio
**Par:** porcion-005
**Tipo:** BACK
**Prerequisitos:** porcion-002
**estado:** completada

## Descripción

Implementar el proveedor `Credentials` de NextAuth v5 para validar el email y la contraseña contra la base de datos, crear la sesión y redirigir a `/panel` ante un login exitoso.

## Ejemplo de uso

El formulario de login (porcion-005) envía `{ email, password }`. NextAuth llama al callback `authorize`, que busca el prestador por email y compara la contraseña con bcrypt. Si coincide, devuelve el usuario y NextAuth crea la sesión. Si no coincide, NextAuth devuelve el error que el frontend muestra como "Email o contraseña incorrectos".

## Criterios de aceptación

- [ ] El proveedor `Credentials` de NextAuth implementa el callback `authorize` con validación de email y contraseña
- [ ] Ante credenciales correctas, la sesión queda activa y se redirige a `/panel`
- [ ] Ante email inexistente o contraseña incorrecta, se devuelve el mismo error genérico (sin distinguir cuál falló)
- [ ] La comparación de contraseñas usa `bcrypt.compare` (nunca comparación directa de strings)
- [ ] La arquitectura permite agregar el proveedor `Google` en el futuro editando solo el archivo de configuración de NextAuth

## Pruebas

### Pruebas unitarias

- [ ] El callback `authorize` retorna el usuario cuando el email existe y la contraseña es correcta
- [ ] El callback `authorize` retorna `null` cuando el email no existe en la BD
- [ ] El callback `authorize` retorna `null` cuando el email existe pero la contraseña no coincide (bcrypt.compare falla)

### Pruebas de integración

- [ ] `POST /api/auth/callback/credentials` con credenciales válidas crea una sesión activa y redirige a `/panel`
- [ ] `POST /api/auth/callback/credentials` con email inexistente devuelve error de autenticación sin revelar que el email no existe
- [ ] `POST /api/auth/callback/credentials` con contraseña incorrecta devuelve el mismo error que con email inexistente
