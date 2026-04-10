# porcion-007 — Modal de reserva — formulario de contacto [FRONT]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** porcion-008
**Tipo:** FRONT
**Prerequisitos:** porcion-005
**Estado:** completada

## Descripción

Mostrar un modal al hacer clic en una card de turno, con un formulario que pide nombre, apellido y teléfono del cliente. El formulario tiene un botón "Confirmar reserva" que dispara la llamada al backend.

## Ejemplo de uso

El cliente hace clic en la card "10:00 — $2.500". Se abre un modal con los campos "Nombre", "Apellido" y "Teléfono". Completa los datos y hace clic en "Confirmar reserva". Mientras se procesa, el botón muestra un estado de carga.

## Criterios de aceptación

- [ ] Al hacer clic en una card de turno, se abre el modal de reserva
- [ ] El modal muestra el horario y precio del turno seleccionado como referencia
- [ ] El formulario tiene los campos: nombre (obligatorio), apellido (obligatorio), teléfono (obligatorio)
- [ ] El botón "Confirmar reserva" está deshabilitado si algún campo obligatorio está vacío
- [ ] Al hacer clic en "Confirmar reserva", el botón muestra estado de carga y se deshabilita para evitar doble envío
- [ ] El modal puede cerrarse sin confirmar (con botón cancelar o haciendo clic fuera)
- [ ] Si el backend devuelve error (turno ya tomado), se muestra el mensaje de error dentro del modal
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "Confirmar reserva" está deshabilitado cuando nombre está vacío
- [ ] El botón "Confirmar reserva" está deshabilitado cuando apellido está vacío
- [ ] El botón "Confirmar reserva" está deshabilitado cuando teléfono está vacío
- [ ] Al recibir estado de error desde el padre, el modal muestra el mensaje de error

### Pruebas de integración

- [ ] Al hacer clic en "Confirmar reserva" con campos completos, se dispara el callback de confirmación con `{ clientName, clientPhone, appointmentId }`
- [ ] Al cerrarse el modal, el formulario se reinicia (campos vacíos)
