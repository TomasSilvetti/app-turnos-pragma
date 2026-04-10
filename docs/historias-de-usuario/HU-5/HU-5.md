# HU-5: Gestión de tipos de turno

**Como** proveedor de servicios,
**quiero** crear, editar y eliminar los tipos de turno que ofrezco,
**para** que mis clientes puedan elegir qué servicio reservar al momento de sacar un turno.

## Descripción

El proveedor necesita definir el catálogo de servicios que ofrece antes de configurar su agenda. Cada tipo de turno tiene un título, una descripción y un precio. Esta información se usará luego al generar los turnos disponibles para los clientes.

## Criterios de aceptación

- [ ] El proveedor puede ver la lista de tipos de turno que tiene creados
- [ ] El proveedor puede crear un nuevo tipo de turno con título, descripción y precio
- [ ] El proveedor puede editar un tipo de turno existente
- [ ] El proveedor puede eliminar un tipo de turno siempre que no tenga reservas futuras activas
- [ ] Si intenta eliminar un tipo con reservas futuras activas, se muestra un mensaje de error explicativo
- [ ] El precio debe ser un número mayor a cero
- [ ] El título es obligatorio; descripción y precio también
- [ ] Los cambios se persisten correctamente en base de datos

## Flujos

### Flujo principal — Crear tipo de turno

1. El proveedor navega a `/panel/tipos-de-turno`
2. Ve la lista de tipos existentes (vacía si es primera vez)
3. Hace clic en "Agregar tipo de turno"
4. Se abre un formulario (modal o inline) con campos: título, descripción, precio
5. Completa los campos y confirma
6. El nuevo tipo aparece en la lista

### Flujo alternativo — Editar tipo existente

1. El proveedor hace clic en "Editar" sobre un tipo de turno
2. Se abre el formulario con los datos precargados
3. Modifica los campos y guarda
4. La lista se actualiza con los nuevos datos

### Flujo alternativo — Eliminar tipo sin conflictos

1. El proveedor hace clic en "Eliminar" sobre un tipo de turno
2. Se muestra confirmación: "¿Estás seguro? Esta acción no se puede deshacer."
3. Confirma → el tipo se elimina y desaparece de la lista

### Flujo alternativo — Eliminar tipo con reservas activas

1. El proveedor intenta eliminar un tipo que tiene reservas futuras activas
2. El sistema muestra un error: "No podés eliminar este tipo de turno porque tiene reservas futuras. Cancelalas primero."
3. El tipo no se elimina

### Flujo alternativo — Validación inválida

1. El proveedor intenta guardar con campos vacíos o precio inválido (cero, negativo, texto)
2. Se muestran errores inline por campo
3. No se guarda hasta corregir los errores

## Notas técnicas

⚠️ **Base de datos:** Esta historia requiere un nuevo modelo `ServiceType` (o similar) con campos: `id`, `title`, `description`, `price`, `serviceProviderId`. Debe verificarse si ya existe en el esquema de Prisma o si hay que crearlo. La relación con `Appointment` y `Booking` deberá considerarse para la validación de eliminación.
