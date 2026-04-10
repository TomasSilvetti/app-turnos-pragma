# porcion-009 — Pantalla de confirmación de reserva exitosa [FRONT]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-007
**Estado:** completada

## Descripción

Mostrar al cliente una pantalla o sección de confirmación con el resumen de su reserva una vez que el backend responde con éxito. Incluye día, hora, precio y nombre del negocio.

## Ejemplo de uso

Tras confirmar la reserva, el modal se cierra y aparece una pantalla con: "¡Reserva confirmada! Turno en Peluquería Ana — Jueves 15 de abril a las 10:00 — $2.500".

## Criterios de aceptación

- [ ] Tras una reserva exitosa, se muestra la confirmación con: nombre del negocio, fecha, hora y precio
- [ ] La confirmación reemplaza o cierra el modal de reserva (no se superponen)
- [ ] La card del turno reservado desaparece de la lista de turnos disponibles
- [ ] El cliente puede volver a ver el calendario desde la confirmación (botón o link de regreso)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] El componente renderiza correctamente con los datos de reserva recibidos como props (`businessName`, `date`, `time`, `price`)
- [ ] El botón de regreso dispara el callback para volver a la vista del calendario

### Pruebas de integración

- [ ] Tras recibir respuesta 201 del endpoint de reserva, la UI muestra la confirmación con los datos correctos
- [ ] La card del turno recién reservado ya no aparece en la lista de turnos disponibles
