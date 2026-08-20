// Genera el secreto de Google Authenticator para la consola.
//
// Imprime el QR para escanear y el secreto para pegar en Vercel. Se corre una
// sola vez: el secreto que sale acá es el que valida todos los códigos futuros,
// así que si se pierde hay que volver a emparejar el teléfono.
//
//   node scripts/consola-totp.mjs

import { randomBytes, createHmac } from "crypto";
import QRCode from "qrcode";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function aBase32(buf) {
  let bits = 0;
  let acumulado = 0;
  let salida = "";
  for (const byte of buf) {
    acumulado = (acumulado << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      salida += ALFABETO[(acumulado >> bits) & 31];
    }
  }
  if (bits > 0) salida += ALFABETO[(acumulado << (5 - bits)) & 31];
  return salida;
}

function desdeBase32(secreto) {
  let bits = 0;
  let acumulado = 0;
  const bytes = [];
  for (const c of secreto) {
    acumulado = (acumulado << 5) | ALFABETO.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulado >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

// Misma cuenta que src/lib/notas/totp.ts, para poder mostrar el código de ahora
// y que se pueda comparar contra lo que muestra el teléfono.
function codigo(secreto) {
  const contador = Buffer.alloc(8);
  contador.writeUInt32BE(Math.floor(Date.now() / 1000 / 30), 4);
  const hmac = createHmac("sha1", desdeBase32(secreto)).update(contador).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const truncado =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(truncado % 1e6).padStart(6, "0");
}

// 20 bytes es el largo que recomienda el RFC 4226 para HMAC-SHA1.
const secreto = aBase32(randomBytes(20));
const uri = `otpauth://totp/${encodeURIComponent("Consola (notas)")}?secret=${secreto}&issuer=${encodeURIComponent("App Turnos")}`;

console.log(await QRCode.toString(uri, { type: "terminal", small: true }));
console.log("Secreto (para cargarlo a mano en la app):");
console.log(`  ${secreto.replace(/(.{4})/g, "$1 ").trim()}\n`);
console.log("Poné esto en Vercel (Settings → Environment Variables):");
console.log(`  CONSOLA_TOTP_SECRET=${secreto}\n`);
console.log(`El código de este momento es ${codigo(secreto)} — tiene que coincidir con el del teléfono.`);
