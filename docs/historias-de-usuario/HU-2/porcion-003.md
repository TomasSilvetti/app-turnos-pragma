# porcion-003 — API de creación de perfil y upload de logo [BACK]

**Estado:** completada

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** porcion-002
**Tipo:** BACK
**Prerequisitos:** porcion-001

## Descripción

Implementar el endpoint que recibe los datos del formulario de perfil (incluyendo la imagen del logo), guarda el archivo en disco o almacenamiento en la nube, persiste el perfil en la base de datos y genera el slug único para el link público del negocio.

## Ejemplo de uso

El formulario envía un `multipart/form-data` con los seis campos. El endpoint guarda el logo, genera el slug `peluqueria-sol` a partir del nombre "Peluquería Sol", crea el `BusinessProfile` en la base de datos y devuelve el slug para que el frontend redirija al panel.

## Criterios de aceptación

- [ ] El endpoint acepta `POST /api/business-profile` con `multipart/form-data` conteniendo los campos: `name`, `address`, `phone`, `cbu`, `alias` y el archivo `logo`
- [ ] El logo se guarda en el sistema de archivos o servicio de almacenamiento configurado y se persiste solo la URL resultante en la base de datos
- [ ] El slug se genera automáticamente a partir del nombre del negocio (sin tildes, en minúsculas, espacios reemplazados por guiones)
- [ ] Si el slug generado ya existe, se agrega un sufijo numérico incremental para garantizar unicidad (ej: `peluqueria-sol-2`)
- [ ] El endpoint responde con el perfil creado incluyendo el slug generado
- [ ] Si algún campo obligatorio falta, el endpoint devuelve `400` con el detalle de qué campo falla
- [ ] Solo el `ServiceProvider` autenticado puede crear su propio perfil; intentos sin sesión devuelven `401`
- [ ] Si el prestador ya tiene un perfil, el endpoint devuelve `409`

## Pruebas

### Pruebas unitarias

- [ ] La función de generación de slug convierte "Peluquería Sol" en `peluqueria-sol`
- [ ] La función de generación de slug elimina caracteres especiales y tildes correctamente
- [ ] La función de unicidad de slug devuelve `peluqueria-sol-2` si `peluqueria-sol` ya existe
- [ ] El endpoint rechaza requests sin token de sesión con `401`

### Pruebas de integración

- [ ] Enviar un `multipart/form-data` válido crea un `BusinessProfile` en la base de datos con todos los campos correctos
- [ ] La URL del logo almacenada en la base de datos apunta a un archivo accesible
- [ ] Enviar el request sin el campo `phone` devuelve `400` con el mensaje de error correspondiente
- [ ] Enviar el request dos veces con el mismo prestador devuelve `409` en el segundo intento
- [ ] El slug generado es único aunque dos negocios tengan el mismo nombre
