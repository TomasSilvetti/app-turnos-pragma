# HU-8: Configuración de horarios con vista previa de turnos

**Como** proveedor,
**quiero** gestionar mis configuraciones de horarios y ver una vista previa en tiempo real de los turnos generados,
**para** verificar que la configuración es correcta antes de que los clientes puedan reservar turnos.

## Descripción

El proveedor accede a la pantalla de configuración de turnos donde puede crear múltiples configuraciones de horario (por ejemplo, una para lunes a miércoles y otra para jueves y viernes). Cada configuración define el horario de atención, el intervalo entre turnos, los días habilitados y los tipos de turno disponibles.

A medida que el proveedor ajusta los parámetros, una vista previa en tiempo real muestra un mini calendario del mes con los días habilitados resaltados. Al seleccionar un día en el calendario, se despliegan las cards de turnos disponibles en dos columnas, permitiendo verificar visualmente que la generación de turnos es correcta.

## Criterios de aceptación

- [ ] La pantalla muestra una lista de configuraciones de horario. Si no hay ninguna, la lista aparece vacía con un botón "Agregar horario".
- [ ] Al hacer clic en "Agregar horario" se abre un modal con los campos: nombre de la configuración, hora de apertura, hora de cierre, intervalo entre turnos, días habilitados y tipos de turno.
- [ ] Al guardar desde el modal, aparece un nuevo item en la lista con el título de la configuración y un resumen con días, horario de apertura, horario de cierre y duración de turno.
- [ ] Cada item de la lista tiene íconos para editar, eliminar y un toggle para activar/desactivar la configuración.
- [ ] El sistema no permite que dos configuraciones activas compartan al menos un día habilitado; si ocurre un conflicto, muestra un mensaje de error indicando los días en conflicto y no activa la configuración.
- [ ] Debajo de la lista de configuraciones se muestra siempre el botón "Agregar horario" para poder añadir configuraciones adicionales.
- [ ] La vista previa muestra un mini calendario del mes actual que se actualiza en tiempo real reflejando los días habilitados por las configuraciones activas.
- [ ] Los días sin turnos habilitados aparecen desactivados (no interactuables) en el mini calendario.
- [ ] Al hacer clic en un día habilitado del calendario, se muestran las cards de turnos disponibles en dos columnas, todas con estado "Disponible".
- [ ] Al hacer clic en un día deshabilitado del calendario, no ocurre ninguna acción.

## Flujos

### Flujo principal — Agregar primera configuración

1. El proveedor accede a la pantalla de configuración de turnos y ve la lista vacía con el botón "Agregar horario".
2. Hace clic en "Agregar horario" y se abre el modal con el formulario vacío.
3. Completa el nombre de la configuración, horario de apertura y cierre, intervalo entre turnos, días habilitados y tipos de turno.
4. Hace clic en "Guardar".
5. El modal se cierra y aparece el nuevo item en la lista con título y resumen de la configuración.
6. La vista previa del mini calendario se actualiza mostrando los días habilitados de la configuración.
7. Debajo del item sigue apareciendo el botón "Agregar horario".

### Flujo principal — Ver turnos del día en la vista previa

1. El proveedor visualiza el mini calendario con los días habilitados resaltados.
2. Hace clic en un día habilitado.
3. Debajo del calendario se actualizan las cards mostrando todos los turnos del día en dos columnas, cada una con el horario y el estado "Disponible".

### Flujo alternativo 1 — Editar configuración existente

1. El proveedor hace clic en el ícono de editar de un item de la lista.
2. Se abre el modal pre-cargado con los datos actuales de esa configuración.
3. Modifica los campos deseados y hace clic en "Guardar".
4. El modal se cierra y el item en la lista se actualiza con los nuevos datos.
5. La vista previa se actualiza en consecuencia.

### Flujo alternativo 2 — Eliminar configuración

1. El proveedor hace clic en el ícono de eliminar de un item.
2. El item se elimina de la lista.
3. La vista previa se actualiza eliminando los días que correspondían a esa configuración.

### Flujo alternativo 3 — Conflicto entre configuraciones activas

1. El proveedor intenta activar mediante el toggle una configuración que comparte días habilitados con otra configuración ya activa.
2. El sistema detecta el conflicto y muestra un mensaje de error indicando los días en conflicto (ej: "Esta configuración comparte el día lunes con otra configuración activa").
3. El toggle no se activa y la configuración permanece desactivada hasta que se resuelva el conflicto editando los días habilitados.

### Flujo alternativo 4 — Clic en día deshabilitado del calendario

1. El proveedor hace clic en un día que aparece desactivado en el mini calendario.
2. No ocurre ninguna acción; el día no es interactuable.

## Notas técnicas

⚠️ **Base de datos:** Esta historia requiere almacenar múltiples configuraciones de horario por proveedor, cada una con sus propios parámetros (horario, intervalo, días habilitados, tipos de turno, estado activo/inactivo). El equipo deberá verificar si la estructura actual de la base de datos soporta múltiples configuraciones por proveedor o si es necesario crear o modificar las entidades correspondientes. También se deberá implementar la lógica de validación de conflictos entre configuraciones activas a nivel de servidor para garantizar la integridad de los datos.
