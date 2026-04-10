# porcion-006 — Confirmación y flujo de eliminación — vista [FRONT]

**Estado:** ✅ Completada
**Completada el:** 2026-04-10
**Historia de usuario:** HU-5: Gestión de tipos de turno
**Par:** porcion-007
**Tipo:** FRONT
**Prerequisitos:** porcion-002

## Descripción

Implementar el flujo visual de eliminación de un tipo de turno: diálogo de confirmación antes de eliminar, y mensaje de error si el tipo tiene reservas futuras activas que impiden la eliminación.

## Ejemplo de uso

El proveedor hace clic en "Eliminar" sobre un tipo de turno. Aparece un diálogo: "¿Estás seguro? Esta acción no se puede deshacer." con botones "Cancelar" y "Eliminar". Si confirma y el backend responde con error de reservas activas, el diálogo muestra: "No podés eliminar este tipo de turno porque tiene reservas futuras. Cancelalas primero." Si la eliminación es exitosa, el ítem desaparece de la lista.

## Criterios de aceptación

- [ ] Al hacer clic en "Eliminar", aparece un diálogo de confirmación antes de ejecutar la acción
- [ ] El diálogo muestra el texto "¿Estás seguro? Esta acción no se puede deshacer."
- [ ] El diálogo tiene botones "Cancelar" y "Eliminar"
- [ ] Si se cancela, el diálogo se cierra y el tipo no se elimina
- [ ] Si el backend devuelve error por reservas activas, se muestra el mensaje de error dentro del diálogo
- [ ] Si la eliminación es exitosa, el ítem desaparece de la lista sin recargar la página
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El diálogo de confirmación se muestra al hacer clic en "Eliminar"
- [ ] Al hacer clic en "Cancelar", el diálogo se cierra sin disparar el callback de eliminación
- [ ] Cuando el componente recibe un estado de error "reservas activas", muestra el mensaje correspondiente
- [ ] Cuando el componente recibe confirmación de eliminación exitosa, el ítem se remueve del listado

### Pruebas de integración

- [ ] Al confirmar la eliminación con respuesta exitosa del backend, la lista se actualiza sin recargar
- [ ] Al confirmar la eliminación con respuesta de error del backend, el mensaje de error es visible en el diálogo
