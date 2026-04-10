# porcion-005 — Formulario agregar egreso + listado de egresos — vista [FRONT]

**Historia de usuario:** HU-10: Módulo de Finanzas
**Par:** porcion-006
**Tipo:** FRONT
**Prerequisitos:** porcion-002
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Crear el formulario para registrar un nuevo egreso (campos "Descripción" y "Monto" con botón "+") y el listado de egresos existentes debajo. El formulario llama al server action de porcion-006 al enviarse y actualiza la lista optimistamente.

## Ejemplo de uso

El prestador ve la sección "AGREGAR EGRESO" con dos inputs y un botón rojo "+". Completa "Compra de insumos" y "5000", hace clic en "+" y el egreso aparece inmediatamente en el listado "EGRESOS" debajo.

## Criterios de aceptación

- [ ] El formulario tiene dos campos: "Descripción" (texto) y "Monto" (número)
- [ ] El botón "+" está deshabilitado si alguno de los dos campos está vacío
- [ ] El botón "+" está deshabilitado mientras se procesa el envío (previene doble submit)
- [ ] Al enviar exitosamente, los campos se limpian y el egreso aparece en el listado
- [ ] Si el servidor retorna error, se muestra un toast/mensaje de error
- [ ] La sección "EGRESOS" muestra "Sin egresos cargados." cuando no hay ninguno
- [ ] Cada egreso en el listado muestra: descripción y monto formateado en rojo (ej: `−$5.000`)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El botón "+" está deshabilitado cuando "Descripción" está vacío
- [ ] El botón "+" está deshabilitado cuando "Monto" está vacío o es 0
- [ ] El botón "+" se habilita cuando ambos campos tienen valor válido
- [ ] Después de un submit exitoso, los campos quedan en blanco

### Pruebas de integración

- [ ] Al hacer clic en "+" con datos válidos, se llama al server action de porcion-006
- [ ] Si el server action retorna éxito, el nuevo egreso aparece en el listado sin recargar la página
- [ ] Si el server action retorna error, los campos no se limpian y se muestra el error
