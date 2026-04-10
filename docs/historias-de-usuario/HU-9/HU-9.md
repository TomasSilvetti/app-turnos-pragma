# HU-9: Visibilidad de turnos reservados, tipos de turno en modal público y en configuración de horario

## Descripción

Mejorar la experiencia del cliente y del administrador en tres aspectos:

1. Los turnos ya reservados deben seguir visibles en la grilla pública pero con estilo "Reservado" (gris, no clickeable), mientras que los disponibles se muestran en verde.
2. Al crear/editar una configuración de horario, el administrador puede asociar tipos de turno existentes.
3. El modal de reserva pública muestra los tipos de turno disponibles del horario seleccionado para que el cliente elija uno.

## Porciones

| # | Nombre | Tipo | Prerequisitos |
|---|--------|------|---------------|
| 001 | API disponibilidad — incluir turnos reservados y serviceTypes | BACK | — |
| 002 | Cards de turnos — estilos disponible/reservado | FRONT | 001 |
| 003 | Modal de reserva — selector de tipo de turno | FRONT | 001, 002 |
| 004 | POST booking — persistir serviceTypeId | BACK | — |
| 005 | ScheduleConfigList — conectar tipos de turno al modal | FRONT | — |
