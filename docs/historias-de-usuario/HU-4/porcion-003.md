# porcion-003 — Mini calendario mensual — vista con días resaltados [FRONT]

**Historia de usuario:** HU-4: Consulta pública de turnos disponibles por prestador
**Par:** porcion-004
**Tipo:** FRONT
**Prerequisitos:** porcion-002
**Estado:** completada

## Descripción

Agregar el mini calendario mensual dentro de la página pública. Muestra todos los días del mes, resalta los que tienen turnos disponibles, y permite seleccionar un día. El día actual aparece seleccionado por defecto.

## Ejemplo de uso

El cliente ve un calendario del mes actual. Los días con turnos disponibles aparecen con un punto o color diferente. Al hacer clic en uno de esos días, ese día queda marcado como seleccionado y los turnos debajo se actualizan.

## Criterios de aceptación

- [ ] El calendario muestra todos los días del mes actual
- [ ] Los días recibidos como "con disponibilidad" aparecen visualmente resaltados
- [ ] El día actual está seleccionado por defecto al cargar
- [ ] Los días sin disponibilidad no son clicables (visualmente deshabilitados)
- [ ] Al hacer clic en un día resaltado, el estado de selección se actualiza
- [ ] Al cambiar la selección, se emite un evento o callback con la nueva fecha seleccionada
- [ ] El componente acepta como prop la lista de fechas disponibles (`string[]` en formato `YYYY-MM-DD`)
- [ ] El componente es responsive y se visualiza correctamente en mobile, tablet y desktop

## Pruebas

### Pruebas unitarias

- [ ] Los días incluidos en la prop de disponibilidad se renderizan con la clase/estilo de resaltado
- [ ] Los días no incluidos en la prop de disponibilidad se renderizan como deshabilitados
- [ ] Al hacer clic en un día disponible, el callback recibe la fecha correcta en formato `YYYY-MM-DD`
- [ ] El día actual aparece seleccionado al montar el componente sin selección previa

### Pruebas de integración

- [ ] El calendario recibe la lista de fechas disponibles desde el componente padre y las muestra correctamente resaltadas
- [ ] Al seleccionar un día, el componente padre recibe la fecha y puede usarla para filtrar los turnos
