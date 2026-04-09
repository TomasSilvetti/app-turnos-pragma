# porcion-002 — Formulario de perfil del negocio — vista [FRONT]

**Historia de usuario:** HU-2: Gestión de perfil del negocio
**Par:** porcion-003
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** completada

## Descripción

Crear la pantalla de configuración inicial del perfil del negocio con todos sus campos: nombre, logo (con drag & drop), dirección, teléfono, CBU y alias. El botón de guardar queda bloqueado si hay campos incompletos y se muestran mensajes de error por campo.

## Ejemplo de uso

El prestador ve una página con el título "Configurá tu negocio", seis campos de formulario y un área de carga de imagen para el logo. Si intenta guardar sin completar el teléfono, aparece el mensaje "El teléfono es obligatorio" debajo de ese campo y el botón permanece deshabilitado.

## Criterios de aceptación

- [ ] La página muestra los campos: nombre del negocio, logo, dirección, teléfono, CBU y alias
- [ ] El área de logo acepta arrastre de imagen (drag & drop) y también permite seleccionar desde el explorador de archivos
- [ ] Al soltar o seleccionar una imagen válida, se muestra una previsualización del logo
- [ ] Si se arrastra un archivo que no es imagen, se muestra un mensaje de error en el área de carga
- [ ] El botón "Guardar perfil" está deshabilitado mientras haya campos obligatorios vacíos
- [ ] Cada campo muestra su mensaje de error correspondiente al perder el foco si está vacío
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "Guardar perfil" está deshabilitado cuando uno o más campos están vacíos
- [ ] El botón "Guardar perfil" se habilita cuando todos los campos tienen valor
- [ ] Se muestra previsualización de imagen al seleccionar un archivo de tipo imagen
- [ ] Se muestra error "Formato no válido" al intentar cargar un archivo que no es imagen
- [ ] Cada campo vacío muestra su mensaje de error al perder el foco (blur)

### Pruebas de integración

- [ ] Al completar todos los campos y hacer clic en "Guardar perfil", se llama al servicio de creación de perfil con los datos correctos
- [ ] Mientras el servicio está procesando, el botón muestra estado de carga y no puede volver a clickearse
- [ ] Si el servicio devuelve un error de validación por campo específico, el mensaje de error del servidor se muestra bajo el campo correspondiente
