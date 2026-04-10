22# porcion-006 — Cards de turnos del día seleccionado [FRONT]

**Historia de usuario:** HU-8: Configuración de horarios con vista previa de turnos
**Par:** porcion-007
**Tipo:** FRONT
**Prerequisitos:** porcion-005
**Estado:** completado

## Descripción

Mostrar debajo del mini calendario las cards de los turnos disponibles para el día seleccionado, distribuidas en dos columnas. Cada card muestra el horario del turno y el estado "Disponible". La lista se actualiza cada vez que el usuario selecciona un día diferente en el calendario. Por ahora trabaja con datos mockeados; la conexión real con el backend se hace en porcion-007.

## Ejemplo de uso

El proveedor hace clic en un martes habilitado del calendario. Debajo del calendario aparecen en dos columnas las cards: "09:00 — Disponible", "09:30 — Disponible", "10:00 — Disponible", y así sucesivamente hasta las 13:00. Si selecciona un día diferente, la lista se reemplaza con los turnos de ese nuevo día.

## Criterios de aceptación

- [ ] Al seleccionar un día habilitado en el calendario, se muestran las cards de turnos en dos columnas debajo del calendario
- [ ] Cada card muestra el horario del turno (ej: "09:30") y el texto "Disponible"
- [ ] Al seleccionar un día diferente, las cards se reemplazan con los turnos del nuevo día seleccionado
- [ ] Si no hay día seleccionado, el área de cards no muestra nada (o un mensaje indicando que se seleccione un día)
- [ ] Mientras se carga la información del día (estado de carga), se muestra un indicador visual (skeleton o spinner)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Dado un array de slots mockeados, se renderizan exactamente esa cantidad de cards
- [ ] Las cards se distribuyen en dos columnas
- [ ] Cada card muestra el campo `time` del slot y el texto "Disponible"
- [ ] Cuando `isLoading` es `true`, se renderiza el indicador de carga en lugar de las cards
- [ ] Cuando no hay día seleccionado (`selectedDay = null`), no se renderiza ninguna card

### Pruebas de integración

- [ ] Al cambiar el día seleccionado, el componente reemplaza las cards anteriores con las del nuevo día (sin superposición)
- [ ] Si el backend devuelve un array vacío de slots para el día seleccionado, se muestra un mensaje indicando que no hay turnos disponibles para ese día
