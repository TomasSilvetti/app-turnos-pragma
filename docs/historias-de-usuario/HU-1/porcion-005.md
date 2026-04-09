# porcion-005 — Formulario de login — vista [FRONT]

**Historia de usuario:** HU-1: Autenticación de prestadores de servicio
**Par:** porcion-006
**Tipo:** FRONT
**Prerequisitos:** Ninguno

## Descripción

Crear la pantalla de login en `/login` con los campos email y contraseña, el botón de ingreso y el estado visual de error cuando las credenciales son incorrectas.

## Ejemplo de uso

El prestador navega a `/login`, ve un formulario con dos campos (email y contraseña) y el botón "Ingresar". Si ingresa credenciales incorrectas, aparece el mensaje "Email o contraseña incorrectos" debajo del formulario. El formulario no revela cuál de los dos campos falló.

## Criterios de aceptación

- [ ] La ruta `/login` renderiza el formulario de login
- [ ] El formulario contiene campos para email y contraseña
- [ ] El botón "Ingresar" está deshabilitado si algún campo está vacío
- [ ] Al recibir error de credenciales inválidas, se muestra el mensaje "Email o contraseña incorrectos"
- [ ] El mensaje de error no indica cuál de los dos campos es incorrecto
- [ ] El campo contraseña oculta el texto por defecto con opción de mostrarlo
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "Ingresar" se deshabilita cuando email está vacío
- [ ] El botón "Ingresar" se deshabilita cuando contraseña está vacía
- [ ] El mensaje "Email o contraseña incorrectos" se muestra cuando el componente recibe el estado de error de credenciales
- [ ] El toggle de visibilidad de contraseña alterna el tipo del input entre "password" y "text"

### Pruebas de integración

- [ ] Al hacer clic en "Ingresar" con los dos campos completos, se dispara la llamada al servicio de autenticación
- [ ] Si el servicio devuelve error de credenciales inválidas, el componente muestra el mensaje de error sin navegar
