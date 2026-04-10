# porcion-003 — Modal de reserva: selector de tipo de turno [FRONT]

**Historia de usuario:** HU-9
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-001, porcion-002
**Estado:** pendiente

## Descripción

Agregar al modal de reserva pública (`BookingModal`) un selector de tipo de turno cuando el slot tiene tipos de turno disponibles.

El cliente debe poder elegir uno de los tipos antes de confirmar. El tipo seleccionado determina el precio que se muestra y se envía al backend. Si el slot no tiene tipos de turno asociados, el modal no muestra esa sección (comportamiento actual).

## Cambios

**Archivo:** `src/components/public/BookingModal.tsx`

1. Agregar `serviceTypes: { id: string; title: string; price: number }[]` al tipo `Props` (junto con el appointment).
2. Agregar estado `selectedServiceTypeId: string | null`.
3. Si `serviceTypes.length > 0`, renderizar una sección "Tipo de turno *" con cards/botones seleccionables (uno por tipo, mostrando título y precio).
4. Actualizar `isValid` para requerir `selectedServiceTypeId` cuando `serviceTypes.length > 0`.
5. Incluir `serviceTypeId` en el objeto que se pasa a `onConfirm`.
6. El precio mostrado en el header del modal debe ser el del tipo de turno seleccionado (si hay uno), o el precio del slot si no hay tipos.

**Archivo:** `src/components/public/BookingSection.tsx`

1. Pasar `appointment.serviceTypes` al `BookingModal`.
2. Incluir `serviceTypeId` en el payload enviado a `POST /api/public/bookings`.

## Criterios de aceptación

- [ ] Si el slot tiene tipos de turno, el modal muestra la sección "Tipo de turno" antes del formulario
- [ ] El cliente debe seleccionar un tipo para poder confirmar (botón deshabilitado hasta entonces)
- [ ] Al seleccionar un tipo, el precio en el header del modal se actualiza al precio del tipo seleccionado
- [ ] Si el slot no tiene tipos de turno, el modal funciona igual que antes
- [ ] El `serviceTypeId` seleccionado se envía al endpoint POST

## Pruebas

- [ ] Modal con `serviceTypes` vacío no muestra la sección de tipos
- [ ] Modal con tipos renderiza cada tipo como opción seleccionable con nombre y precio
- [ ] Botón "Confirmar reserva" está deshabilitado hasta que se elige un tipo (cuando hay tipos disponibles)
- [ ] El precio del header cambia al seleccionar un tipo
- [ ] El payload enviado incluye `serviceTypeId` cuando se seleccionó uno
