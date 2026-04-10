# porcion-002 — Página y listado de tipos de turno — vista [FRONT]

**Estado:** ✅ Completada
**Completada el:** 2026-04-10
**Historia de usuario:** HU-5: Gestión de tipos de turno
**Par:** porcion-003
**Tipo:** FRONT
**Prerequisitos:** Ninguno

## Descripción

Crear la página `/panel/tipos-de-turno` que muestra la lista de tipos de turno del proveedor. Incluye un estado vacío cuando no hay tipos creados y un botón para agregar uno nuevo.

## Ejemplo de uso

El proveedor navega a `/panel/tipos-de-turno` y ve una lista con sus tipos de turno (título, descripción, precio) y botones de "Editar" y "Eliminar" por cada uno. Si no tiene ninguno, ve un mensaje "Todavía no creaste ningún tipo de turno" y el botón "Agregar tipo de turno".

## Criterios de aceptación

- [ ] La página existe en la ruta `/panel/tipos-de-turno`
- [ ] Se muestra una lista con los tipos de turno, mostrando título, descripción y precio por cada ítem
- [ ] Cada ítem tiene botones "Editar" y "Eliminar" visibles
- [ ] Cuando no hay tipos creados, se muestra un estado vacío con mensaje descriptivo
- [ ] Hay un botón "Agregar tipo de turno" visible en todo momento
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El componente renderiza correctamente con un array de tipos de turno
- [ ] El componente renderiza el estado vacío cuando el array está vacío
- [ ] El botón "Agregar tipo de turno" está presente en ambos estados (con y sin datos)
- [ ] Cada ítem de la lista muestra título, descripción y precio

### Pruebas de integración

- [ ] La página carga y renderiza la lista con datos mockeados correctamente
- [ ] Los botones "Editar" y "Eliminar" están accesibles por cada ítem de la lista
