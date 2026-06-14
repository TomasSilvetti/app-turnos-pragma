import { createHash } from "crypto";

// La app de notas no tiene login: la recuperación cross-device funciona con una
// contraseña que elige el usuario. La contraseña es a la vez la clave de búsqueda
// (debe ser única) y la prueba de identidad. Guardamos sólo un hash determinístico
// —nunca la contraseña en claro— para poder buscarla y garantizar unicidad.

const PEPPER = process.env.NOTAS_PASSWORD_PEPPER ?? "notas-pragma";

export const MIN_PASSWORD_LENGTH = 6;

// Normaliza lo que escribe el usuario (sólo recorta espacios de los bordes; el
// resto de los caracteres cuenta, para no debilitar la contraseña).
export function normalizePassword(input: string): string {
  return input.trim();
}

export function isValidPassword(input: string): boolean {
  return normalizePassword(input).length >= MIN_PASSWORD_LENGTH;
}

// Hash determinístico (mismo input → mismo hash) para poder indexarlo y buscarlo.
export function hashPassword(input: string): string {
  return createHash("sha256").update(`${PEPPER}:${normalizePassword(input)}`).digest("hex");
}
