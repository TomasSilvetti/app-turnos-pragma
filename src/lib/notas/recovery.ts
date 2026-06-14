import { randomInt } from "crypto";

// Palabras simples en español para armar una frase de recuperación legible.
// 4 palabras de esta lista dan entropía suficiente para el caso (app anónima).
const WORDS = [
  "sol", "luna", "mar", "rio", "monte", "valle", "nube", "lluvia", "viento", "fuego",
  "tierra", "arbol", "flor", "hoja", "raiz", "fruta", "piedra", "arena", "ola", "playa",
  "bosque", "selva", "campo", "cielo", "estrella", "cometa", "rayo", "trueno", "nieve", "hielo",
  "gato", "perro", "lobo", "zorro", "oso", "leon", "tigre", "aguila", "buho", "cuervo",
  "pez", "ballena", "delfin", "tortuga", "abeja", "mariposa", "hormiga", "grillo", "rana", "sapo",
  "rojo", "verde", "azul", "negro", "blanco", "gris", "dorado", "plata", "cobre", "bronce",
  "norte", "sur", "este", "oeste", "centro", "cumbre", "cueva", "puente", "faro", "puerto",
  "barco", "ancla", "vela", "remo", "timon", "mapa", "ruta", "sendero", "camino", "huella",
  "casa", "torre", "muro", "techo", "puerta", "llave", "reloj", "libro", "papel", "tinta",
  "pluma", "lapiz", "cuerda", "nudo", "rueda", "motor", "chispa", "brasa", "ceniza", "humo",
  "pan", "miel", "sal", "azucar", "cafe", "limon", "naranja", "uva", "trigo", "maiz",
  "guitarra", "tambor", "flauta", "violin", "campana", "eco", "ritmo", "canto", "verso", "danza",
  "luz", "sombra", "espejo", "cristal", "perla", "rubi", "jade", "coral", "topacio", "diamante",
];

function pickWord(): string {
  return WORDS[randomInt(WORDS.length)];
}

// Genera una frase tipo "sol-monte-faro-abeja". Normalizada (minúsculas, sin espacios).
export function generateRecoveryPhrase(): string {
  return Array.from({ length: 4 }, pickWord).join("-");
}

// Normaliza lo que escribe el usuario para compararlo con el guardado.
export function normalizeRecoveryPhrase(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quitar tildes
    .replace(/[^a-z]+/g, "-") // cualquier separador → guion
    .replace(/^-+|-+$/g, "");
}
