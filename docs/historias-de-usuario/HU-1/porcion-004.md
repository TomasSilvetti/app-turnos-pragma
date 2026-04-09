# porcion-004 — Endpoint de registro — lógica y API [BACK]

**Estado:** completada

**Historia de usuario:** HU-1: Autenticación de prestadores de servicio
**Par:** porcion-003
**Tipo:** BACK
**Prerequisitos:** porcion-001, porcion-002

## Descripción

Implementar la lógica de negocio y el endpoint de registro: validar que el email no esté en uso, hashear la contraseña con bcrypt, crear el registro en la base de datos e iniciar sesión automáticamente redirigiendo a `/panel`.

## Ejemplo de uso

El formulario de registro (porcion-003) envía `{ name, email, password }`. El endpoint verifica que el email no exista, guarda el prestador con la contraseña hasheada, crea la sesión con NextAuth y devuelve una redirección a `/panel`. Si el email ya está registrado, devuelve un error que la vista puede mostrar.

## Criterios de aceptación

- [ ] El endpoint recibe `name`, `email` y `password` desde el formulario de registro
- [ ] Si el email ya existe en la base de datos, devuelve un error descriptivo sin crear el registro
- [ ] La contraseña se hashea con bcrypt antes de persistirse (nunca se guarda en texto plano)
- [ ] Tras crear el registro exitosamente, se inicia sesión automáticamente y se redirige a `/panel`
- [ ] Los campos `name` y `email` se validan como no vacíos y el email como formato válido antes de consultar la BD

## Pruebas

### Pruebas unitarias

- [ ] La función de registro hashea la contraseña antes de llamar a Prisma (el valor guardado no es igual al original)
- [ ] Si `prisma.serviceProvider.findUnique` devuelve un registro existente, la función retorna el error de email duplicado sin crear nada
- [ ] Un email con formato inválido (ej: "noesEmail") es rechazado antes de consultar la base de datos

### Pruebas de integración

- [ ] `POST /api/auth/register` con datos válidos crea un nuevo `ServiceProvider` en la BD y devuelve redirección a `/panel`
- [ ] `POST /api/auth/register` con un email ya registrado devuelve status 400 y el mensaje "Ya existe una cuenta con ese email"
- [ ] `POST /api/auth/register` con campos faltantes devuelve status 400 con validación de campos
- [ ] Tras un registro exitoso, la sesión de NextAuth queda activa para el nuevo prestador
