export type Rol = 'Administrador' | 'Empleado';

/** Usuario del personal (los clientes no tienen usuario). Nunca incluye la contraseña. */
export interface Usuario {
  usuarioId: number;
  nombreUsuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

/** Cuerpo de POST /api/Usuarios. */
export interface NuevoUsuario {
  nombreUsuario: string;
  nombre: string;
  clave: string;
  rol: Rol;
}

/** Cuerpo de PUT /api/Usuarios/{id}. claveNueva null = no cambia la contraseña. */
export interface CambiosUsuario {
  nombre: string;
  rol: Rol;
  activo: boolean;
  claveNueva: string | null;
}
