# HU-2: Gestión de perfil del negocio

**Como** prestador de servicios recién registrado,
**quiero** completar el perfil de mi negocio con nombre, logo, dirección, teléfono, CBU y alias,
**para** que mis clientes puedan encontrarme a través de mi link compartible y reservar turnos sin necesidad de iniciar sesión.

## Descripción

Al ingresar por primera vez luego del registro, el prestador es redirigido obligatoriamente al formulario de configuración de perfil del negocio. No puede acceder al panel principal hasta completar todos los campos requeridos. Una vez guardado el perfil, el sistema genera automáticamente un link público y único que el prestador puede compartir con sus clientes para que reserven turnos.

El perfil también puede ser editado en cualquier momento desde el panel, permitiendo actualizar la información o reemplazar el logo.

## Criterios de aceptación

- [ ] Al iniciar sesión por primera vez, el prestador es redirigido automáticamente al formulario de perfil del negocio antes de acceder al panel.
- [ ] El formulario contiene los campos: nombre del negocio, logo (carga o arrastre de imagen), dirección, teléfono, CBU y alias.
- [ ] Todos los campos son obligatorios. El botón de guardar está bloqueado o muestra errores si alguno está incompleto.
- [ ] El campo de logo permite arrastrar una imagen o seleccionarla desde el explorador de archivos.
- [ ] Al guardar correctamente, el sistema genera un link público único para el negocio (ej: `/turnos/nombre-negocio`) y redirige al prestador al panel principal.
- [ ] El link generado es accesible públicamente sin necesidad de iniciar sesión y muestra la página de reserva de turnos del prestador.
- [ ] Desde el panel, el prestador puede acceder a la sección de perfil para editar cualquier campo, incluyendo reemplazar el logo.
- [ ] Los cambios al editar el perfil se reflejan inmediatamente en el link público del negocio.

## Flujos

### Flujo principal (escenario de éxito)

1. El prestador inicia sesión por primera vez con su cuenta recién creada.
2. El sistema detecta que el perfil del negocio no está configurado y redirige al formulario de perfil.
3. El prestador completa los campos: nombre del negocio, logo, dirección, teléfono, CBU y alias.
4. El prestador hace clic en "Guardar perfil".
5. El sistema valida que todos los campos estén completos.
6. El sistema guarda el perfil, genera el link público único del negocio y redirige al prestador al panel principal.
7. El prestador puede copiar y compartir su link con clientes.

### Flujo alternativo 1 — Campos incompletos

1. El prestador intenta guardar el formulario sin completar uno o más campos obligatorios.
2. El sistema muestra mensajes de error indicando qué campos faltan o son inválidos.
3. El guardado queda bloqueado hasta que todos los campos estén completos.
4. El prestador completa los campos faltantes y reintenta guardar.

### Flujo alternativo 2 — Edición del perfil

1. El prestador accede a la sección de perfil desde el panel principal.
2. El sistema muestra el formulario con los datos actuales del negocio.
3. El prestador modifica uno o más campos (puede reemplazar el logo cargando una nueva imagen).
4. El prestador guarda los cambios.
5. El sistema actualiza el perfil y confirma la operación. Los cambios se reflejan en el link público.

## Notas técnicas

⚠️ **Base de datos:** Esta historia requiere una entidad `BusinessProfile` (o similar) asociada al prestador, que almacene nombre, URL del logo, dirección, teléfono, CBU, alias y el slug generado para el link público. El slug debe ser único por negocio. La imagen del logo deberá almacenarse en un servicio de archivos (ej: almacenamiento en disco o en la nube) y guardar la URL resultante en la base de datos. El equipo deberá verificar si la estructura de base de datos ya contempla esta entidad o si debe crearse.
