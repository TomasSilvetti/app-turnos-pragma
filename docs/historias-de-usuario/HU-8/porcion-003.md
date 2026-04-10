# porcion-003 — Modal de creación/edición de configuración [FRONT]

**Historia de usuario:** HU-8: Configuración de horarios con vista previa de turnos
**Par:** porcion-004
**Tipo:** FRONT
**Prerequisitos:** porcion-002
**Estado:** 🔄 En progreso

## Descripción

Crear el modal con el formulario para agregar o editar una configuración de horario. El modal contiene los campos: nombre de la configuración, hora de apertura, hora de cierre, intervalo entre turnos (en minutos), días habilitados (selector múltiple de días de la semana) y tipos de turno disponibles. Cuando se edita, los campos se pre-cargan con los datos existentes. Por ahora el submit llama a un handler mockeado; la conexión real con la API se hace en porcion-004.

## Ejemplo de uso

El proveedor hace clic en "Agregar horario", se abre el modal con todos los campos vacíos. Completa "Lunes a miércoles" como nombre, selecciona lunes, martes y miércoles, define 09:00 como apertura y 13:00 como cierre, elige 30 minutos de intervalo y selecciona los tipos de turno. Al hacer clic en "Guardar", el modal se cierra. Si hace clic en el ícono de editar de un item existente, el modal se abre con los datos pre-cargados.

## Criterios de aceptación

- [ ] El modal se abre al hacer clic en "Agregar horario" con todos los campos vacíos
- [ ] El modal se abre al hacer clic en el ícono de editar de un item, con los campos pre-cargados con los datos de esa configuración
- [ ] El formulario tiene los campos: nombre, hora de apertura, hora de cierre, intervalo en minutos, días habilitados (checkboxes de lunes a domingo) y tipos de turno (selección múltiple)
- [ ] El botón "Guardar" está deshabilitado si algún campo obligatorio está vacío o si ningún día está seleccionado
- [ ] Al hacer clic en "Cancelar" o fuera del modal, el modal se cierra sin guardar cambios
- [ ] Al hacer clic en "Guardar" con datos válidos, se llama al handler de submit y el modal se cierra
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "Guardar" está deshabilitado cuando el campo nombre está vacío
- [ ] El botón "Guardar" está deshabilitado cuando no hay ningún día seleccionado
- [ ] El botón "Guardar" está deshabilitado cuando hora de apertura es igual o mayor a hora de cierre
- [ ] En modo edición, cada campo muestra el valor pre-cargado correspondiente
- [ ] Al hacer clic en "Cancelar", se dispara el callback `onClose` sin llamar al de submit

### Pruebas de integración

- [ ] Al hacer clic en "Guardar" con todos los campos válidos, se llama al handler `onSubmit` con el objeto de datos correcto (nombre, startTime, endTime, intervalMinutes, daysOfWeek, serviceTypeIds)
- [ ] Abrir el modal en modo edición con datos de una configuración existente y guardarlo sin modificar nada llama al handler con los datos originales sin alteraciones
