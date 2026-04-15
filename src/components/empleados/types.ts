export type SucursalRef = {
  id: string;
  name: string;
};

export type Empleado = {
  id: string;
  nombre: string;
  email: string;
  rol: "administrador" | "empleado" | "propietario";
  sucursales: SucursalRef[];
};

export type EmpleadoFormValues = {
  nombre: string;
  email: string;
  password: string;
  rol: "administrador" | "empleado";
  sucursalIds: string[];
};

export type EditEmpleadoValues = {
  rol: "administrador" | "empleado";
  sucursalIds: string[];
};
