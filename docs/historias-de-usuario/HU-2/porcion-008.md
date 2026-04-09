# porcion-008 — Sección de edición de perfil en el panel [FRONT]

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-002, porcion-003
**Estado:** ✅ Completada
**Completada el:** 2026-04-09

## Descripción

Integrar el formulario de perfil dentro del panel del prestador como sección de edición. Al acceder, el formulario se pre-carga con los datos actuales del negocio y permite modificar cualquier campo, incluyendo reemplazar el logo.

## Ejemplo de uso

El prestador accede a "Mi negocio" desde el menú del panel. Ve el formulario con todos sus datos actuales cargados. Cambia el teléfono, sube un logo nuevo y guarda. El sistema confirma los cambios y el link público muestra los datos actualizados.

## Criterios de aceptación

- [ ] La sección de perfil en el panel muestra el formulario pre-cargado con los datos actuales del negocio
- [ ] El área de logo muestra el logo actual como previsualización y permite reemplazarlo
- [ ] Al guardar, si no se selecciona un nuevo logo, se mantiene el logo existente
- [ ] Tras guardar exitosamente, se muestra un mensaje de confirmación ("Perfil actualizado")
- [ ] Si ocurre un error al guardar, se muestra un mensaje de error sin perder los cambios del formulario
- [ ] El link público del negocio se muestra en la sección para que el prestador pueda copiarlo
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El formulario se inicializa con los valores del negocio recibidos como props o desde el servicio
- [ ] Si no se selecciona nuevo logo, el payload de actualización no incluye el campo de imagen
- [ ] El botón de copiar link copia el link público al portapapeles y muestra confirmación visual

### Pruebas de integración

- [ ] Al cargar la sección, el formulario muestra los datos actuales obtenidos del endpoint de perfil
- [ ] Al guardar cambios válidos, se llama al endpoint de actualización con los datos modificados y se muestra el mensaje de éxito
- [ ] Si el endpoint devuelve error, el formulario mantiene los cambios ingresados y muestra el mensaje de error
- [ ] Los cambios guardados se reflejan inmediatamente en el formulario sin necesidad de recargar la página
