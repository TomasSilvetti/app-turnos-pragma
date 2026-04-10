# porcion-004 — Formulario crear/editar tipo de turno — vista [FRONT]

**Estado:** ✅ Completada
**Completada el:** 2026-04-10
**Historia de usuario:** HU-5: Gestión de tipos de turno
**Par:** porcion-005
**Tipo:** FRONT
**Prerequisitos:** porcion-002

## Descripción

Crear el formulario (modal o inline) para crear y editar un tipo de turno. El mismo formulario sirve para ambas acciones: si recibe datos existentes, los precarga para edición. Incluye validaciones inline por campo y muestra errores sin enviar el formulario.

## Ejemplo de uso

El proveedor hace clic en "Agregar tipo de turno" y aparece un formulario con tres campos: "Título" (obligatorio), "Descripción" (obligatorio) y "Precio" (obligatorio, mayor a cero). Si deja el título vacío y hace clic en guardar, aparece "El título es obligatorio" debajo del campo. Al editar, los campos vienen precargados con los valores actuales.

## Criterios de aceptación

- [ ] El formulario tiene tres campos: título, descripción y precio
- [ ] El título y la descripción son campos de texto; el precio es numérico
- [ ] Si se intenta guardar con campos vacíos, se muestran errores inline por campo
- [ ] Si el precio es cero, negativo o no numérico, se muestra error inline
- [ ] En modo edición, los campos se precargan con los valores del tipo seleccionado
- [ ] El botón de guardar está deshabilitado mientras hay errores de validación visibles
- [ ] Hay un botón o acción para cancelar y cerrar el formulario sin guardar
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El formulario muestra error en "título" si se intenta guardar con ese campo vacío
- [ ] El formulario muestra error en "descripción" si se intenta guardar con ese campo vacío
- [ ] El formulario muestra error en "precio" si el valor es cero, negativo o texto no numérico
- [ ] En modo edición, los campos se inicializan con los valores recibidos por props
- [ ] El botón guardar está deshabilitado cuando hay al menos un error de validación

### Pruebas de integración

- [ ] Al completar todos los campos válidos y hacer clic en guardar, se dispara el callback correspondiente con los datos del formulario
- [ ] Al hacer clic en cancelar, el formulario se cierra sin llamar al callback de guardado
