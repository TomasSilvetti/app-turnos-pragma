# porcion-003 — Formulario de registro — vista [FRONT]

**Historia de usuario:** HU-1: Autenticación de prestadores de servicio
**Par:** porcion-004
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** completado

## Descripción

Crear la pantalla de registro en `/register` con los campos nombre, email y contraseña, el botón de envío, y los estados visuales para errores de validación y email duplicado.

## Ejemplo de uso

El prestador navega a `/register`, ve un formulario con tres campos (nombre, email, contraseña) y un botón "Crear cuenta". Si deja un campo vacío e intenta enviar, aparece un mensaje de error bajo el campo correspondiente. Si el sistema responde que el email ya existe, se muestra el mensaje "Ya existe una cuenta con ese email" y el formulario conserva los datos ingresados.

## Criterios de aceptación

- [ ] La ruta `/register` renderiza el formulario de registro
- [ ] El formulario contiene campos para nombre, email y contraseña
- [ ] El botón "Crear cuenta" está deshabilitado si algún campo está vacío
- [ ] Se muestran mensajes de error por campo cuando la validación falla
- [ ] Al recibir error de email duplicado del backend, se muestra "Ya existe una cuenta con ese email" sin limpiar el formulario
- [ ] El campo contraseña oculta el texto por defecto
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "Crear cuenta" se deshabilita cuando cualquiera de los campos está vacío
- [ ] El botón "Crear cuenta" se habilita cuando los tres campos tienen contenido
- [ ] El mensaje de error de email duplicado se muestra cuando el componente recibe ese estado de error
- [ ] El formulario no se limpia al mostrar el error de email duplicado (los datos ingresados se conservan)

### Pruebas de integración

- [ ] Al enviar el formulario con los tres campos completos, se dispara la llamada al servicio de registro con los datos correctos
- [ ] Si el servicio de registro devuelve error de email duplicado, el componente muestra el mensaje correspondiente sin navegar
