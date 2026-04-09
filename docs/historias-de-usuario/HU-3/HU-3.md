# HU-3: Configuración de turnos del prestador

**Como** prestador de servicios autenticado,
**quiero** configurar mis horarios de atención, el intervalo entre turnos y el precio por turno,
**para** que el sistema genere automáticamente los turnos disponibles que los clientes podrán reservar.

## Descripción

El prestador accede al panel de administración y configura su disponibilidad horaria: establece una hora de inicio, una hora de fin, un intervalo en minutos y un precio por turno. Con esa información, el sistema genera automáticamente todos los slots disponibles dentro del rango. Además, el prestador puede desactivar o eliminar turnos individuales cuando necesite bloquear un horario puntual sin modificar toda la configuración.

Esta historia cubre la configuración inicial y la gestión posterior de los turnos desde el panel. Los turnos generados son los que luego se muestran al cliente en el flujo de reserva (HU-4). Por ahora se trabaja con una única sucursal.

## Criterios de aceptación

- [ ] El prestador puede ingresar hora de inicio, hora de fin, intervalo (en minutos) y precio por turno, y guardar la configuración.
- [ ] Al guardar, el sistema genera automáticamente todos los turnos dentro del rango con el intervalo indicado (ej: 08:00 a 15:00 cada 60 min → 08:00, 09:00, ..., 14:00).
- [ ] El prestador puede ver la lista de turnos generados desde el panel.
- [ ] El prestador puede desactivar un turno específico; ese turno deja de mostrarse como disponible para los clientes.
- [ ] El prestador puede eliminar un turno específico de forma permanente.
- [ ] Si el prestador modifica la configuración y guarda, el sistema regenera los turnos con los nuevos parámetros.
- [ ] El sistema impide guardar si: algún campo obligatorio está vacío, la hora de fin es menor o igual a la hora de inicio, el precio es negativo o cero, o el intervalo no es un valor positivo válido.
- [ ] Los mensajes de error de validación son claros e indican qué campo es inválido y por qué.

## Flujos

### Flujo principal (configurar turnos por primera vez)

1. El prestador accede al panel de administración → sección de configuración de turnos.
2. Completa los campos: hora de inicio, hora de fin, intervalo entre turnos (en minutos) y precio por turno.
3. Hace clic en "Guardar configuración".
4. El sistema valida los datos ingresados.
5. El sistema genera automáticamente todos los turnos dentro del rango con el intervalo indicado.
6. El prestador ve la lista de turnos generados con su horario y precio.

### Flujo alternativo 1 — Desactivar o eliminar un turno específico

1. El prestador accede a la lista de turnos generados.
2. Selecciona un turno específico y elige "Desactivar" o "Eliminar".
3. Si desactiva: el turno permanece en la lista marcado como inactivo y no aparece disponible para los clientes.
4. Si elimina: el turno se elimina permanentemente de la lista.

### Flujo alternativo 2 — Editar configuración existente

1. El prestador modifica uno o más campos de la configuración (hora de inicio, fin, intervalo o precio) y guarda.
2. El sistema valida los nuevos valores.
3. El sistema regenera los turnos con la nueva configuración.
4. El prestador ve la lista actualizada de turnos.

### Flujo alternativo 3 — Validación de datos inválidos

1. El prestador intenta guardar con datos inválidos (campo vacío, hora de fin ≤ hora de inicio, precio negativo o cero, intervalo inválido).
2. El sistema muestra mensajes de error indicando qué campo es inválido y por qué.
3. No se guarda ningún cambio ni se generan turnos.
4. El prestador corrige los datos y puede volver a intentarlo.

## Notas técnicas

⚠️ **Base de datos:** Esta historia requiere persistir la configuración de horarios del prestador (hora de inicio, hora de fin, intervalo, precio) y los turnos generados. El esquema actual cuenta con `ScheduleConfig` para la configuración y `Appointment` para los turnos. El equipo deberá verificar si el campo `precio` necesita agregarse al modelo `ScheduleConfig` o si se maneja en otro modelo, y si la generación de turnos se realiza al guardar la configuración o de forma dinámica en cada consulta del cliente.

⚠️ **Generación de slots:** La lógica de generación de turnos a partir de la configuración reside en `src/lib/schedule/`. Al modificar la configuración, el equipo deberá definir cómo se tratan los turnos ya reservados que queden fuera del nuevo rango horario.
