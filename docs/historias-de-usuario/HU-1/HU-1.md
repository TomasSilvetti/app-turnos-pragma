# HU-1: Autenticación de prestadores de servicio

**Como** prestador de servicios,
**quiero** poder registrarme e iniciar sesión con email y contraseña,
**para** acceder al panel de administración donde gestiono mis turnos y configuración.

## Descripción

Los prestadores de servicio (peluqueros, médicos, etc.) necesitan una cuenta propia para acceder al panel de administración de la plataforma. Esta historia cubre el registro de nuevas cuentas y el inicio de sesión con credenciales. El acceso al panel debe estar protegido: cualquier intento de ingresar sin sesión activa redirige automáticamente al login. En el futuro se incorporará inicio de sesión con Google, por lo que la implementación debe contemplar esa extensión.

## Criterios de aceptación

- [ ] El prestador puede registrarse ingresando nombre, email y contraseña
- [ ] El sistema valida que el email no esté ya registrado y muestra un error si lo está
- [ ] El prestador puede iniciar sesión con email y contraseña correctos
- [ ] Ante credenciales incorrectas, el sistema muestra el mensaje "Email o contraseña incorrectos" sin especificar cuál campo falló
- [ ] Tras un registro o login exitoso, el sistema redirige al panel `/panel`
- [ ] Cualquier ruta bajo `/panel` redirige a `/login` si el prestador no tiene sesión activa
- [ ] Las contraseñas se almacenan hasheadas (bcrypt), nunca en texto plano

## Flujos

### Flujo principal — Registro

1. El prestador navega a `/register`
2. Completa el formulario con nombre, email y contraseña
3. El sistema valida que el email no exista previamente
4. El sistema crea la cuenta con la contraseña hasheada
5. El sistema crea la sesión automáticamente y redirige a `/panel`

### Flujo principal — Login

1. El prestador navega a `/login`
2. Ingresa su email y contraseña
3. El sistema valida las credenciales contra la base de datos
4. El sistema crea la sesión y redirige a `/panel`

### Flujo alternativo — Email ya registrado

1. El prestador intenta registrarse con un email que ya existe
2. El sistema muestra el error: "Ya existe una cuenta con ese email"
3. El formulario permanece con los datos ingresados para que pueda corregirlo

### Flujo alternativo — Credenciales inválidas

1. El prestador ingresa email o contraseña incorrectos en el login
2. El sistema muestra el error genérico: "Email o contraseña incorrectos"
3. No se revela cuál de los dos campos es incorrecto

### Flujo alternativo — Acceso sin autenticar

1. El prestador intenta acceder a cualquier ruta bajo `/panel` sin sesión activa
2. El sistema redirige automáticamente a `/login`

## Notas técnicas

⚠️ **Base de datos:** Esta historia requiere la entidad `ServiceProvider` con campos `id`, `name`, `email` y `hashedPassword`. El equipo deberá verificar que el schema de Prisma incluya este modelo antes de implementar el módulo.

La implementación usa **NextAuth v5 (beta)** con el proveedor `Credentials`. La arquitectura debe dejar preparado el soporte para agregar el proveedor `Google` en una historia futura sin refactoring mayor.
