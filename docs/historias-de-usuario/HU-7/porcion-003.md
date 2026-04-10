# porcion-003 — Selector de turnos con formulario precargado del cliente [FRONT]

**Historia de usuario:** HU-7: Reprogramación de clientes con reservas en conflicto
**Par:** porcion-004
**Tipo:** FRONT
**Prerequisitos:** porcion-002
**Estado:** ✅ Completada
**Completada el:** 2026-04-10

## Descripción

Al hacer clic en "Reprogramar" desde la lista, se abre el selector de turnos (calendario + slots disponibles) con el formulario de confirmación precargado con el nombre y teléfono del cliente. El proveedor solo elige el nuevo turno y confirma.

## Ejemplo de uso

El proveedor hace clic en "Reprogramar" junto a "Juan Pérez". Se abre un modal o panel con el calendario de turnos disponibles. El proveedor navega al día deseado, selecciona un slot y ve el formulario de confirmación ya completado con "Juan Pérez" y "+54 11 1234-5678". Solo necesita confirmar.

## Criterios de aceptación

- [ ] Al hacer clic en "Reprogramar", se abre el selector de turnos (calendario + slots)
- [ ] El selector reutiliza los mismos componentes de calendario y cards de slots que la vista pública `/p/[slug]`
- [ ] Al seleccionar un slot, el formulario de confirmación aparece con `clientName` y `clientPhone` precargados y no editables
- [ ] El botón "Confirmar" llama al endpoint de reprogramación con el slot seleccionado y los datos del cliente
- [ ] Si no hay slots disponibles, se muestra el mensaje "No hay turnos disponibles. Revisá tu configuración de horarios."
- [ ] El selector se puede cerrar sin confirmar, dejando al cliente en la lista de pendientes
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El formulario de confirmación renderiza con los campos `clientName` y `clientPhone` ya completados
- [ ] Los campos `clientName` y `clientPhone` están deshabilitados para edición
- [ ] El estado vacío del selector se muestra cuando no hay slots disponibles
- [ ] El botón "Confirmar" está deshabilitado hasta que se selecciona un slot

### Pruebas de integración

- [ ] Al hacer clic en "Reprogramar", el selector se abre con los datos del cliente correctos
- [ ] Al seleccionar un slot y hacer clic en "Confirmar", se llama a `POST /api/panel/reschedules` con el `bookingId`, el nuevo `appointmentId`, `clientName` y `clientPhone`
- [ ] Si se cierra el selector sin confirmar, el cliente permanece en la lista
