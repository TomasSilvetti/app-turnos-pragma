/**
 * Tests for the NextAuth `authorize` callback (profesional login).
 * We test the logic directly rather than going through the full NextAuth handler.
 */

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("../lib/prisma", () => ({
  prisma: {
    serviceProvider: {
      findUnique: jest.fn(),
    },
  },
}));

import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const mockCompare = bcrypt.compare as jest.Mock;
const mockFindUnique = prisma.serviceProvider.findUnique as jest.Mock;

// Replicate the authorize logic from auth.ts so we can test it in isolation
async function authorize(credentials: { email?: string; password?: string } | null) {
  const email = credentials?.email;
  const password = credentials?.password;

  if (!email || !password) return null;

  const provider = await prisma.serviceProvider.findUnique({
    where: { email, isActive: true },
    include: {
      businessProfile: { select: { id: true } },
      empresas: { select: { businessProfileId: true } },
    },
  });

  if (!provider) return null;

  const passwordMatch = await bcrypt.compare(password, (provider as { hashedPassword: string }).hashedPassword);
  if (!passwordMatch) return null;

  const p = provider as {
    id: string;
    name: string;
    email: string;
    rol: string;
    tutorialCompleted: boolean;
    hashedPassword: string;
    businessProfile?: { id: string } | null;
    empresas: { businessProfileId: string }[];
  };

  const businessProfileId =
    p.businessProfile?.id ?? p.empresas[0]?.businessProfileId ?? null;

  return {
    id: p.id,
    name: p.name,
    email: p.email,
    rol: p.rol,
    hasProfile: !!p.businessProfile || p.empresas.length > 0,
    businessProfileId,
    tutorialCompleted: p.tutorialCompleted,
  };
}

const baseProvider = {
  id: "sp-1",
  name: "Juan",
  email: "juan@test.com",
  rol: "propietario",
  hashedPassword: "hashed",
  isActive: true,
  tutorialCompleted: false,
  businessProfile: { id: "bp-1" },
  empresas: [],
};

describe("authorize (profesional login)", () => {
  beforeEach(() => {
    mockFindUnique.mockResolvedValue(baseProvider);
    mockCompare.mockResolvedValue(true);
  });

  it("retorna los datos del usuario con credenciales válidas", async () => {
    const result = await authorize({ email: "juan@test.com", password: "Secure@123" });
    expect(result).toMatchObject({
      id: "sp-1",
      email: "juan@test.com",
      rol: "propietario",
      hasProfile: true,
      businessProfileId: "bp-1",
    });
  });

  it("retorna null si el email no está registrado", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await authorize({ email: "noexiste@test.com", password: "Secure@123" });
    expect(result).toBeNull();
  });

  it("retorna null si la contraseña es incorrecta", async () => {
    mockCompare.mockResolvedValue(false);
    const result = await authorize({ email: "juan@test.com", password: "wrong" });
    expect(result).toBeNull();
  });

  it("retorna null si no se pasan credenciales", async () => {
    const result = await authorize(null);
    expect(result).toBeNull();
  });

  it("retorna null si el email está vacío", async () => {
    const result = await authorize({ email: "", password: "Secure@123" });
    expect(result).toBeNull();
  });

  it("retorna null si la contraseña está vacía", async () => {
    const result = await authorize({ email: "juan@test.com", password: "" });
    expect(result).toBeNull();
  });

  it("resuelve businessProfileId desde empresas cuando no tiene businessProfile propio", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseProvider,
      businessProfile: null,
      empresas: [{ businessProfileId: "bp-2" }],
    });
    const result = await authorize({ email: "juan@test.com", password: "Secure@123" });
    expect(result?.businessProfileId).toBe("bp-2");
    expect(result?.hasProfile).toBe(true);
  });

  it("retorna hasProfile false y businessProfileId null cuando no tiene perfil ni empresa", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseProvider,
      businessProfile: null,
      empresas: [],
    });
    const result = await authorize({ email: "juan@test.com", password: "Secure@123" });
    expect(result?.hasProfile).toBe(false);
    expect(result?.businessProfileId).toBeNull();
  });
});
