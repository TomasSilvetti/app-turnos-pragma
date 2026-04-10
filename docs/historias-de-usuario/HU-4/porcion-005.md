# porcion-005 — Cards de turnos disponibles por día — vista [FRONT]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** porcion-006
**Tipo:** FRONT
**Prerequisitos:** porcion-003
**Estado:** completada

## Descripción

Mostrar debajo del calendario los turnos disponibles del día seleccionado, organizados en dos columnas de cards. Cada card muestra el horario y el precio. Si no hay turnos, muestra un mensaje informativo.

## Ejemplo de uso

El cliente selecciona el día 15 en el calendario y debajo aparecen cards: "10:00 — $2.500", "11:00 — $2.500", "14:00 — $2.500". Si no hay turnos ese día, aparece el texto "No hay turnos disponibles para este día".

## Criterios de aceptación

- [ ] Los turnos del día seleccionado se muestran en una grilla de dos columnas
- [ ] Cada card muestra el horario (`time`) y el precio (`price`) del turno
- [ ] Si la lista de turnos está vacía, se muestra el mensaje "No hay turnos disponibles para este día"
- [ ] Al hacer clic en una card, se emite un evento o callback con el turno seleccionado
- [ ] Las cards de turnos sin disponibilidad (ya reservados) no se muestran
- [ ] El componente acepta como prop un array de turnos con forma `{ id, time, price }`
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Con un array de 3 turnos, el componente renderiza 3 cards
- [ ] Con un array vacío, el componente renderiza el mensaje "No hay turnos disponibles para este día"
- [ ] Al hacer clic en una card, el callback recibe el objeto del turno correspondiente

### Pruebas de integración

- [ ] Al seleccionar un día en el calendario (porcion-003), la lista de turnos se actualiza con los datos del nuevo día
- [ ] Si el día seleccionado no tiene turnos, la sección muestra el mensaje informativo sin errores de renderizado
