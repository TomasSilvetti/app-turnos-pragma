# HU-6: Configuración de horarios con generación lazy de turnos

**Como** proveedor de servicios,
**quiero** configurar mi disponibilidad semanal (horarios, intervalo, días y tipos de turno),
**para** que el sistema genere automáticamente los turnos disponibles cuando los clientes consulten mi agenda.

## Descripción

El proveedor define los parámetros de su agenda: horario de apertura y cierre, duración de cada turno, días de la semana habilitados y qué tipos de turno ofrece. Con esa configuración, el sistema genera los slots disponibles de forma lazy: los turnos de un mes se crean en base de datos la primera vez que un cliente consulta ese mes, no al momento de guardar la configuración. Si el proveedor modifica la configuración, los meses ya generados se regeneran y los que aún no fueron consultados se generarán con la nueva config cuando corresponda.

## Criterios de aceptación

- [ ] El proveedor puede configurar horario de apertura y cierre en formato 24hs
- [ ] El proveedor puede seleccionar el intervalo de duración de cada turno (en minutos)
- [ ] El proveedor puede seleccionar los días de la semana habilitados (botones toggle, L-V seleccionados por defecto)
- [ ] El proveedor puede asociar uno o más tipos de turno a la configuración (obtenidos desde HU-5)
- [ ] Al guardar por primera vez, la configuración se persiste sin generar turnos inmediatamente
- [ ] Cuando un cliente consulta la disponibilidad de un mes, el sistema genera los turnos de ese mes si aún no existen
- [ ] Si el proveedor modifica la configuración, se muestra un modal de advertencia antes de guardar
- [ ] Al confirmar la modificación, los turnos de los meses ya generados se borran y se regeneran con la nueva config
- [ ] No se puede guardar con hora de cierre anterior o igual a la hora de apertura
- [ ] No se puede guardar sin al menos un tipo de turno asociado
- [ ] No se puede guardar sin al menos un día de la semana seleccionado

## Flujos

### Flujo principal — Configurar por primera vez

1. El proveedor navega a `/panel/configuracion-turnos`
2. Completa horario de apertura y cierre
3. Selecciona el intervalo (ej: 30 min)
4. Selecciona los días habilitados (L-V por defecto)
5. Elige uno o más tipos de turno de la lista disponible (cargada desde HU-5)
6. Guarda → configuración persistida en base de datos
7. Mensaje de confirmación: "Configuración guardada. Los turnos se generarán cuando los clientes consulten tu agenda."

### Flujo alternativo — Consulta de cliente genera los turnos (lazy)

1. Un cliente accede a `/p/[slug]` y navega a un mes
2. El sistema detecta que ese mes no tiene turnos generados para este proveedor
3. El sistema genera todos los slots del mes según la configuración activa y los inserta en base de datos
4. El cliente ve los turnos disponibles normalmente

### Flujo alternativo — Modificar config sin conflictos

1. El proveedor modifica parámetros de una configuración existente
2. Al intentar guardar, aparece modal: "Estás por actualizar tu configuración. Los turnos ya generados serán reemplazados por los nuevos parámetros. ¿Querés continuar?"
3. El proveedor confirma
4. Se borran los turnos (sin reserva) de los meses ya generados y se regeneran con la nueva config
5. Confirmación de éxito

### Flujo alternativo — Modificar config con reservas en conflicto

1. El proveedor modifica parámetros y al guardar el sistema detecta reservas en turnos que no existirán con la nueva config
2. Modal ampliado: "X reservas activas quedarán sin turno asignado con la nueva configuración. Podés continuar y gestionar las reprogramaciones después, o cancelar para revisar."
3. El proveedor elige continuar
4. Se regeneran los turnos; las reservas afectadas quedan con estado `requires_reschedule`
5. Aparece aviso en el panel: "Tenés [X] clientes que necesitan ser reprogramados" con link a `/panel/reprogramaciones`

### Flujo alternativo — Validación inválida

1. El proveedor intenta guardar con hora de cierre ≤ apertura, sin tipos de turno, o sin días seleccionados
2. Errores inline por campo; no se guarda

## Notas técnicas

⚠️ **Base de datos:** Esta historia requiere un modelo `ScheduleConfig` con campos: `startTime`, `endTime`, `intervalMinutes`, `daysOfWeek` (array o campo serializado), `serviceProviderId`, y una relación many-to-many con `ServiceType`. El modelo `Appointment` debe tener `date` (YYYY-MM-DD), `time`, `serviceProviderId`, `scheduleConfigId`. La generación lazy ocurre en el handler de `GET /api/p/[slug]/availability` y `GET /api/p/[slug]/appointments`: si no existen registros para el mes solicitado, se generan en ese momento antes de responder.
