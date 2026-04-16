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
    title: "Tipos de turno",
    description:
      "Definí los servicios que ofrecés: título, descripción y precio. Cada tipo de turno puede asociarse a una configuración de horarios.",
    icon: "label",
    moduleHref: "/dashboard/tipos-de-turno",
    moduleLabel: "Ir a tipos de turno",
    tooltipTitle: "Creá tu primer tipo de turno",
    tooltipDescription:
      'Hacé clic en "Nuevo tipo de turno", completá el título, la descripción y el precio, y guardá.',
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
      "Creá una configuración indicando los días de la semana, el rango horario y el intervalo entre turnos. Podés asociarla a tipos de turno específicos.",
  },
  {
    title: "Reprogramaciones",
    description:
      "Cuando un cliente pide cambiar su turno, la solicitud aparece acá. Podés aceptarla o rechazarla directamente.",
    icon: "event_repeat",
    moduleHref: "/dashboard/reprogramaciones",
    moduleLabel: "Ir a reprogramaciones",
    tooltipTitle: "Así gestionás los cambios de turno",
    tooltipDescription:
      "Cuando un cliente solicita reprogramar, la solicitud aparece en esta lista. Podés aceptarla o rechazarla con un clic.",
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
      "Acá podés ver los ingresos por turnos, registrar egresos y consultar el balance neto por período.",
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
    title: "Tipos de turno",
    description:
      "Acá podés ver los servicios que ofrece el negocio. Cada tipo de turno tiene título, descripción y precio definidos por el propietario.",
    icon: "label",
    moduleHref: "/dashboard/tipos-de-turno",
    moduleLabel: "Ir a tipos de turno",
    tooltipTitle: "Conocé los servicios del negocio",
    tooltipDescription:
      "Este listado muestra los servicios que ofrece el negocio y que están configurados por los distintos integrantes de la empresa. intenta agregar un nuevo tipo de turno.",
  },
  {
    title: "Configuración de turnos",
    description:
      "Consultá la disponibilidad semanal configurada: días, horarios e intervalos.",
    icon: "calendar_month",
    moduleHref: "/dashboard/configuracion-turnos",
    moduleLabel: "Ir a configuración de turnos",
    tooltipTitle: "Revisá la disponibilidad semanal",
    tooltipDescription:
      "Acá podés configurar tu disponibilidad semanal. Intenta crear una nueva configuracion.",
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
      "Cuando un cliente solicita reprogramar, la solicitud aparece en esta lista. Podés aceptarla o rechazarla con un clic.",
  },
  {
    title: "¡Todo listo para empezar!",
    description:
      "Ya conocés los módulos de tu rol. Podés volver a este tutorial cuando quieras desde Configuración.",
    icon: "check_circle",
  },
];
