import { NextRequest } from "next/server";
import { POST } from "@/app/api/clientes/login/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliente: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("@/lib/cliente-auth", () => ({
  setClientSession: jest.fn().mockResolvedValue(undefined),
}));

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setClientSession } from "@/lib/cliente-auth";

const mockCompare = bcrypt.compare as jest.Mock;
const mockFindUnique = prisma.cliente.findUnique as jest.Mock;
const mockSetSession = setClientSession as jest.Mock;

const existingCliente = {
  id: "c-1",
  nombre: "María",
  apellido: "García",
  email: "maria@test.com",
  hashedPassword: "hashed_password",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/clientes/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/clientes/login", () => {
  beforeEach(() => {
    mockFindUnique.mockResolvedValue(existingCliente);
    mockCompare.mockResolvedValue(true);
  });

  it("hace login con credenciales válidas", async () => {
    const res = await POST(makeRequest({ email: "maria@test.com", password: "Secure@123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe("maria@test.com");
    expect(data.nombre).toBe("María");
  });

  it("no expone el hashedPassword en la respuesta", async () => {
    const res = await POST(makeRequest({ email: "maria@test.com", password: "Secure@123" }));
    const data = await res.json();
    expect(data.hashedPassword).toBeUndefined();
  });

  it("rechaza si falta el email", async () => {
    const res = await POST(makeRequest({ password: "Secure@123" }));
    expect(res.status).toBe(400);
  });

  it("rechaza si falta la contraseña", async () => {
    const res = await POST(makeRequest({ email: "maria@test.com" }));
    expect(res.status).toBe(400);
  });

  it("retorna 401 si el email no existe", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "noexiste@test.com", password: "Secure@123" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Credenciales inválidas/);
  });

  it("retorna 401 si la contraseña es incorrecta", async () => {
    mockCompare.mockResolvedValue(false);
    const res = await POST(makeRequest({ email: "maria@test.com", password: "wrong" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Credenciales inválidas/);
  });

  it("llama setClientSession con duración extendida cuando rememberMe=true", async () => {
    await POST(makeRequest({ email: "maria@test.com", password: "Secure@123", rememberMe: true }));
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: "c-1" }),
      60 * 60 * 24 * 30
    );
  });

  it("llama setClientSession sin duración extendida cuando rememberMe es false", async () => {
    await POST(makeRequest({ email: "maria@test.com", password: "Secure@123", rememberMe: false }));
    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: "c-1" }),
      undefined
    );
  });

  it("normaliza el email a minúsculas al buscar", async () => {
    await POST(makeRequest({ email: "MARIA@TEST.COM", password: "Secure@123" }));
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: "maria@test.com" }) })
    );
  });

  it("rechaza body inválido (no JSON)", async () => {
    const req = new NextRequest("http://localhost/api/clientes/login", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
