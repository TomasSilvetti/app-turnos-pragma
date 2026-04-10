# porcion-002 — Lista de configuraciones de horario — estructura y estado vacío [FRONT]

**Historia de usuario:** HU-8: Configuración de horarios con vista previa de turnos
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** Ninguno
**Estado:** 🔄 En progreso

## Descripción

Crear la pantalla de configuración de horarios con la lista de configuraciones existentes y su estado vacío. Incluye el botón "Agregar horario", los items de la lista con título, resumen (días, horario, intervalo) y los íconos de acción (editar, eliminar, toggle activo/inactivo). Por ahora la lista trabaja con datos mockeados; la conexión real con el backend se hace en porcion-004.

## Ejemplo de uso

El proveedor entra a la sección de horarios y ve la lista vacía con el texto "No tenés configuraciones de horario" y el botón "Agregar horario". Si ya tiene configuraciones, cada una aparece como un card con el nombre, un resumen de días y horario, y los íconos de editar, eliminar y activar/desactivar.

## Criterios de aceptación

- [ ] La pantalla muestra un estado vacío con mensaje y botón "Agregar horario" cuando no hay configuraciones
- [ ] Cada item de la lista muestra: nombre de la configuración, días habilitados, horario de apertura y cierre, e intervalo entre turnos
- [ ] Cada item tiene un ícono de editar, uno de eliminar y un toggle de activo/inactivo
- [ ] El toggle refleja visualmente el estado `isActive` de cada configuración (encendido/apagado)
- [ ] El botón "Agregar horario" aparece siempre al final de la lista, incluso cuando ya hay configuraciones
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Cuando se pasa una lista vacía al componente, se renderiza el estado vacío con el botón "Agregar horario"
- [ ] Cuando se pasa una lista con items, cada item muestra correctamente nombre, días, horario e intervalo
- [ ] El toggle de un item refleja el valor `isActive` recibido como prop
- [ ] Hacer clic en el ícono de editar dispara el callback `onEdit` con el id correcto del item
- [ ] Hacer clic en el ícono de eliminar dispara el callback `onDelete` con el id correcto del item
- [ ] Hacer clic en el toggle dispara el callback `onToggle` con el id correcto del item

### Pruebas de integración

- [ ] La pantalla renderiza correctamente con datos mockeados de múltiples configuraciones (distintos estados activo/inactivo)
- [ ] El botón "Agregar horario" siempre aparece al final, independientemente de la cantidad de items en la lista
