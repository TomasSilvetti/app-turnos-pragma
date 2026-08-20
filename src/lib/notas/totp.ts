import { createHmac, timingSafeEqual } from "crypto";

// TOTP (RFC 6238) — lo que lee Google Authenticator.
//
// Son treinta líneas y `crypto` ya trae HMAC-SHA1, así que no vale la pena una
// dependencia: el algoritmo es HMAC del contador de ventanas de 30 segundos,
// truncado a seis dígitos.

const PASO_S = 30;
const DIGITOS = 6;
// Se aceptan la ventana anterior y la siguiente: el reloj del celular y el del
// servidor no coinciden al segundo, y sin tolerancia el código falla justo
// cuando cambia.
const TOLERANCIA = 1;

function desdeBase32(secreto: string): Buffer {
  const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const limpio = secreto.toUpperCase().replace(/[\s=-]/g, "");

  let bits = 0;
  let acumulado = 0;
  const bytes: number[] = [];

  for (const c of limpio) {
    const valor = ALFABETO.indexOf(c);
    if (valor < 0) throw new Error("El secreto TOTP no es base32 válido");
    acumulado = (acumulado << 5) | valor;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulado >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

export function generarCodigo(secreto: string, ventana: number): string {
  const contador = Buffer.alloc(8);
  // El contador es de 64 bits pero writeUInt32BE cubre hasta el año 6000: el
  // resto es cero por muchísimo tiempo.
  contador.writeUInt32BE(Math.floor(ventana / 0x100000000), 0);
  contador.writeUInt32BE(ventana >>> 0, 4);

  const hmac = createHmac("sha1", desdeBase32(secreto)).update(contador).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncado =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(truncado % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

export function codigoValido(secreto: string, codigo: unknown): boolean {
  if (typeof codigo !== "string") return false;
  const limpio = codigo.replace(/\D/g, "");
  if (limpio.length !== DIGITOS) return false;

  const ahora = Math.floor(Date.now() / 1000 / PASO_S);
  for (let d = -TOLERANCIA; d <= TOLERANCIA; d++) {
    const esperado = generarCodigo(secreto, ahora + d);
    // Comparación de tiempo constante, igual que con el PIN.
    if (timingSafeEqual(Buffer.from(esperado), Buffer.from(limpio))) return true;
  }
  return false;
}
