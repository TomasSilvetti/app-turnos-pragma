import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    serviceProvider: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.serviceProvider.findUnique as jest.Mock;
const mockCreate = prisma.serviceProvider.create as jest.Mock;

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/register (profesional)", () => {
  beforeEach(() => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "sp-1", name: "Juan", email: "juan@test.com" });
  });

  it("registra un profesional con datos válidos", async () => {
    const res = await POST(makeRequest({ name: "Juan", email: "juan@test.com", password: "Secure@123" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("rechaza si falta el nombre", async () => {
    const res = await POST(makeRequest({ name: "", email: "juan@test.com", password: "Secure@123" }));
    expect(res.status).toBe(400);
  });

  it("rechaza si falta el email", async () => {
    const res = await POST(makeRequest({ name: "Juan", email: "", password: "Secure@123" }));
    expect(res.status).toBe(400);
  });

  it("rechaza si falta la contraseña", async () => {
    const res = await POST(makeRequest({ name: "Juan", email: "juan@test.com", password: "" }));
    expect(res.status).toBe(400);
  });

  it("rechaza contraseña menor a 8 caracteres", async () => {
    const res = await POST(makeRequest({ name: "Juan", email: "juan@test.com", password: "abc" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/8 caracteres/);
  });

  it("rechaza email con formato inválido", async () => {
    const res = await POST(makeRequest({ name: "Juan", email: "no-es-email", password: "Secure@123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("rechaza si el email ya está registrado", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(makeRequest({ name: "Juan", email: "juan@test.com", password: "Secure@123" }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/Ya existe/);
  });

  it("rechaza body inválido (no JSON)", async () => {
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("normaliza el email a minúsculas", async () => {
    await POST(makeRequest({ name: "Juan", email: "JUAN@TEST.COM", password: "Secure@123" }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "juan@test.com" }) })
    );
  });
});
