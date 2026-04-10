# porcion-005 — Mini calendario con días habilitados [FRONT]

**Historia de usuario:** HU-8: Configuración de horarios con vista previa de turnos
**Par:** —
**Tipo:** FRONT
**Prerequisitos:** porcion-002, porcion-004

## Descripción

Agregar debajo de la lista de configuraciones un mini calendario del mes actual que resalta en tiempo real los días habilitados por las configuraciones activas. Los días sin cobertura aparecen visualmente desactivados y no son interactuables. Al hacer clic en un día habilitado, se dispara el evento para mostrar los turnos de ese día (implementado en porcion-006).

## Ejemplo de uso

El proveedor tiene dos configuraciones activas: una cubre lunes, martes y miércoles; otra cubre jueves y viernes. El mini calendario del mes muestra todos los lunes, martes, miércoles, jueves y viernes del mes resaltados. Los sábados y domingos aparecen en gris sin interacción. Al hacer clic en un martes habilitado, el componente emite el evento con esa fecha.

## Criterios de aceptación

- [ ] El mini calendario muestra el mes actual con todos sus días
- [ ] Los días cubiertos por al menos una configuración activa aparecen resaltados y son interactuables
- [ ] Los días no cubiertos por ninguna configuración activa aparecen visualmente desactivados y no responden al clic
- [ ] Al hacer clic en un día habilitado, se dispara el callback `onDaySelect` con la fecha seleccionada
- [ ] Al hacer clic en un día deshabilitado, no ocurre ninguna acción
- [ ] El calendario se actualiza en tiempo real cuando cambia la lista de configuraciones activas (por ejemplo, al activar o desactivar una configuración)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Dado un array de configuraciones activas con `daysOfWeek: [1, 2, 3]`, los días lunes, martes y miércoles del mes se marcan como habilitados
- [ ] Un día que no está en ningún `daysOfWeek` de configuraciones activas se renderiza como deshabilitado
- [ ] Hacer clic en un día habilitado llama a `onDaySelect` con el objeto `Date` correcto
- [ ] Hacer clic en un día deshabilitado no llama a `onDaySelect`
- [ ] Si no hay configuraciones activas, todos los días del calendario aparecen deshabilitados

### Pruebas de integración

- [ ] Al desactivar una configuración desde la lista (cambio de estado en el store/contexto), el calendario se re-renderiza y los días de esa configuración pasan a aparecer deshabilitados
- [ ] El calendario renderiza correctamente para un mes con 28, 29, 30 y 31 días (casos borde de febrero y meses largos)
