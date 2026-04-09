---
# porcion-004 — Lista de turnos generados con acciones — vista [FRONT]

**Historia de usuario:** HU-3: Configuración de turnos del prestador
**Par:** porcion-005
**Tipo:** FRONT
**Prerequisitos:** porcion-002
**Estado:** en progreso

## Descripción

Mostrar en el panel de administración la lista de turnos generados, indicando el horario, precio y estado (activo/inactivo) de cada uno, con botones para desactivar o eliminar cada turno individualmente.

## Ejemplo de uso

Debajo del formulario de configuración, el prestador ve una tabla con filas como "08:00 — $2000 — Activo [Desactivar] [Eliminar]". Al hacer clic en "Desactivar", la fila cambia a "Inactivo" y el botón pasa a "Activar". Al hacer clic en "Eliminar", se muestra una confirmación y la fila desaparece de la lista.

## Criterios de aceptación

- [ ] Se muestra una tabla o listado con todos los turnos generados, incluyendo: hora, precio y estado (Activo / Inactivo)
- [ ] Cada turno tiene un botón "Desactivar" si está activo, o "Activar" si está inactivo
- [ ] Cada turno tiene un botón "Eliminar" que solicita confirmación antes de proceder
- [ ] Los turnos inactivos se distinguen visualmente de los activos (ej: texto tachado, color gris, badge)
- [ ] Si no hay turnos generados todavía, se muestra un mensaje vacío indicando que aún no se configuraron turnos
- [ ] El componente recibe los turnos como prop y llama handlers `onToggle(id)` y `onDelete(id)` sin lógica de red interna
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Con una lista de turnos mixtos (activos e inactivos), se renderizan correctamente todos los estados
- [ ] Un turno activo muestra el botón "Desactivar"; uno inactivo muestra "Activar"
- [ ] Al hacer clic en "Desactivar"/"Activar", se llama `onToggle` con el `id` correcto
- [ ] Al confirmar la eliminación, se llama `onDelete` con el `id` correcto
- [ ] Al cancelar la confirmación de eliminación, no se llama `onDelete`
- [ ] Con lista vacía, se muestra el mensaje de estado vacío

### Pruebas de integración

- [ ] El componente integrado con el panel renderiza la lista luego de guardar la configuración (usando datos del estado de la página)
- [ ] Al hacer clic en "Eliminar" y confirmar, el turno desaparece del listado sin recargar la página
