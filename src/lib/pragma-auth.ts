import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const CONFIG_PATH = path.join(process.cwd(), ".pragma-config.json");

interface PragmaConfig {
  passwordHash: string;
  sessionSecret: string;
}

function readConfig(): PragmaConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as PragmaConfig;
  } catch {
    return null;
  }
}

function writeConfig(config: PragmaConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function isPasswordSet(): boolean {
  return readConfig() !== null;
}

export async function setPassword(password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  const sessionSecret = crypto.randomBytes(32).toString("hex");
  writeConfig({ passwordHash, sessionSecret });
}

export async function verifyPassword(password: string): Promise<boolean> {
  const config = readConfig();
  if (!config) return false;
  return bcrypt.compare(password, config.passwordHash);
}

export function generateSessionToken(): string {
  const config = readConfig();
  if (!config) throw new Error("No config");
  const payload = Date.now().toString();
  const sig = crypto
    .createHmac("sha256", config.sessionSecret)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const config = readConfig();
  if (!config) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", config.sessionSecret)
    .update(payload)
    .digest("hex");
  if (sig !== expected) return false;
  // Valid for 30 days
  const ts = parseInt(payload, 10);
  const age = Date.now() - ts;
  return age < 30 * 24 * 60 * 60 * 1000;
}

export const PRAGMA_COOKIE = "pragma-session";
