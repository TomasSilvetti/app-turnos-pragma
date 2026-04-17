export type TutorialStep = {
  title: string;
  description: string;
  moduleHref?: string;
  moduleLabel?: string;
  icon: string;
  tooltipTitle?: string;
  tooltipDescription?: string;
};

export const stepsPropietario: TutorialStep[] = [
  {
    title: "Bienvenido a tu plataforma de turnos",
    description:
      "Desde acá vas a poder gestionar todo tu negocio: turnos, clientes, finanzas y más. Este tutorial te guía por cada módulo para que arranques con confianza.",
    icon: "waving_hand",
  },
  {
    title: "Perfil del negocio",
    description:
      "Configurá el nombre, logo, dirección y color de marca de tu negocio. Esta información aparece en tu página pública de reservas.",
    icon: "store",
    moduleHref: "/dashboard/perfil",
    moduleLabel: "Ir al perfil del negocio",
    tooltipTitle: "Completá el perfil de tu negocio",
    tooltipDescription:
      "Ingresá el nombre, logo, dirección y color de marca. Esta información aparece en tu página pública de reservas.",
  },
  {
    title: "Sucursales",
    description:
      "Creá la primera sucursal de tu negocio. Si tenés varias ubicaciones, podés agregar todas y asignarles empleados y turnos.",
    icon: "location_on",
    moduleHref: "/dashboard/sucursales",
    moduleLabel: "Ir a sucursales",
    tooltipTitle: "Creá tu primera sucursal",
    tooltipDescription:
      'Hacé clic en "Nueva sucursal", ingresá el nombre y la dirección, y guardá. Podés agregar más sucursales después.',
  },
  {
    title: "Horarios y configuración de turnos",
    description:
      "Configurá tu disponibilidad semanal: qué días atendés, en qué horarios y con qué intervalo entre turnos.",
    icon: "calendar_month",
    moduleHref: "/dashboard/configuracion-turnos",
    moduleLabel: "Ir a configuración de turnos",
    tooltipTitle: "Configurá tus horarios de atención",
    tooltipDescription:
      "Creá una configuración con los días y horarios en que atendés. Con el toggle podés elegir entre duración fija (todos los turnos duran lo mismo) o duración por tipo de turno (cada servicio define su propia duración).",
  },
  {
    title: "Reprogramaciones",
    description:
      "Cuando un cliente pide cambiar su turno o cuando seleccionas un turno para reprogramar, la solicitud aparece en este modulo",
    icon: "event_repeat",
    moduleHref: "/dashboard/reprogramaciones",
    moduleLabel: "Ir a reprogramaciones",
    tooltipTitle: "Así gestionás los cambios de turno",
    tooltipDescription:
      "Cuando un cliente solicita reprogramar, la solicitud aparece en esta lista. Podés aceptarla o rechazarla con un clic.",
  },
  {
    title: "Turnos del día",
    description:
      "Desde acá podés ver los turnos pendientes de confirmacion y los turnos confirmados.",
    icon: "bookmark",
    moduleHref: "/dashboard/turnos-reservados",
    moduleLabel: "Ir a turnos reservados",
    tooltipTitle: "Así gestionás los turnos del día",
    tooltipDescription:
      "Acá aparecen todos los turnos reservados. podes confirmar el pago (y se mueven a la lista de confirmados), tambien podes cancelarlos o reprogramarlos.",
  },
  {
    title: "Empleados",
    description:
      "Invitá a tu equipo para que puedan gestionar turnos desde sus propias cuentas. Es opcional.",
    icon: "badge",
    moduleHref: "/dashboard/empleados",
    moduleLabel: "Ir a empleados",
    tooltipTitle: "Invitá a tu equipo",
    tooltipDescription:
      "Podés invitar empleados para que gestionen turnos desde sus propias cuentas. También podés saltear este paso por ahora.",
  },
  {
    title: "Tu link público de reservas",
    description:
      "Compartí tu link con clientes para que reserven turnos online. Lo encontrás en Configuración.",
    icon: "link",
    moduleHref: "/dashboard/configuracion",
    moduleLabel: "Ir a configuración",
    tooltipTitle: "Copiá tu link de reservas",
    tooltipDescription:
      'Tu link público aparece en la sección "Mi link de reservas". Copialo y compartilo con tus clientes.',
  },
  {
    title: "Finanzas",
    description:
      "Visualizá los ingresos generados por turnos, registrá egresos y monitoreá el balance neto.",
    icon: "payments",
    moduleHref: "/dashboard/finanzas",
    moduleLabel: "Ir a finanzas",
    tooltipTitle: "Explorá el módulo de finanzas",
    tooltipDescription:
      "Acá podés ver los ingresos por turnos, registrar egresos y consultar el balance neto por período. Intenta cargar un egreso de prueba.",
  },
  {
    title: "Clientes",
    description:
      "Consultá métricas de tu clientela por período y accedé al listado completo de clientes.",
    icon: "group",
    moduleHref: "/dashboard/clientes",
    moduleLabel: "Ir a clientes",
    tooltipTitle: "Explorá el módulo de clientes",
    tooltipDescription:
      "Acá podés ver métricas de clientela por período y consultar el historial de cada cliente.",
  },
  {
    title: "¡Listo para arrancar!",
    description:
      "Ya conocés todos los módulos. Tu panel está listo. Podés volver a este tutorial cuando quieras desde Configuración.",
    icon: "check_circle",
  },
];

export const stepsEmpleado: TutorialStep[] = [
  {
    title: "Bienvenido al panel de empleados",
    description:
      "Como empleado, podés gestionar los turnos del negocio. Este tutorial te guía por los módulos disponibles para tu rol.",
    icon: "waving_hand",
  },
  {
    title: "Configuración de turnos",
    description:
      "Configurá tu disponibilidad semanal: días, horarios e intervalos. Podés elegir entre duración fija para todos tus turnos o definir una duración distinta según el tipo de turno.",
    icon: "calendar_month",
    moduleHref: "/dashboard/configuracion-turnos",
    moduleLabel: "Ir a configuración de turnos",
    tooltipTitle: "Configurá tus horarios de atención",
    tooltipDescription:
      "Creá una configuración con los días y horarios en que atendés. Con el toggle podés elegir entre duración fija (todos los turnos duran lo mismo) o duración por tipo de turno (cada servicio define su propia duración).",
  },
  {
    title: "Turnos del día",
    description:
      "Desde acá podés ver los turnos pendientes de confirmacion y los turnos confirmados.",
    icon: "bookmark",
    moduleHref: "/dashboard/turnos-reservados",
    moduleLabel: "Ir a turnos reservados",
    tooltipTitle: "Así gestionás los turnos del día",
    tooltipDescription:
      "Acá aparecen todos los turnos reservados. podes confirmar el pago (y se mueven a la lista de confirmados), tambien podes cancelarlos o reprogramarlos.",
  },
  {
    title: "Reprogramaciones",
    description:
      "Cuando un cliente solicita cambiar su turno o tu reprogramas un turno, la solicitud aparece en este modulo.",
    icon: "event_repeat",
    moduleHref: "/dashboard/reprogramaciones",
    moduleLabel: "Ir a reprogramaciones",
    tooltipTitle: "Así gestionás los cambios de turno",
    tooltipDescription:
      "Cuando un cliente o tu mismo solicita reprogramar, la solicitud aparece en esta lista. ",
  },
  {
    title: "¡Todo listo para empezar!",
    description:
      "Ya conocés los módulos de tu rol. Podés volver a este tutorial cuando quieras desde Configuración.",
    icon: "check_circle",
  },
];
