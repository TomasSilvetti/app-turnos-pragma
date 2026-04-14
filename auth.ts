import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { authConfig } from "./auth.config";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const provider = await prisma.serviceProvider.findUnique({
          where: { email, isActive: true },
          include: {
            businessProfile: { select: { id: true } },
            empresas: { select: { businessProfileId: true } },
          },
        });

        if (!provider) return null;

        const passwordMatch = await bcrypt.compare(password, provider.hashedPassword);
        if (!passwordMatch) return null;

        // Para propietarios: su businessProfileId viene de businessProfile
        // Para empleados/administradores: viene de EmpleadoEmpresa
        const businessProfileId =
          provider.businessProfile?.id ??
          provider.empresas[0]?.businessProfileId ??
          null;

        return {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          rol: provider.rol,
          hasProfile: !!provider.businessProfile || provider.empresas.length > 0,
          businessProfileId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.rol = (user as { rol?: string }).rol ?? "propietario";
        token.hasProfile = (user as { hasProfile?: boolean }).hasProfile ?? false;
        token.businessProfileId = (user as { businessProfileId?: string | null }).businessProfileId ?? null;
      }
      if (trigger === "update" && token.id) {
        const provider = await prisma.serviceProvider.findUnique({
          where: { id: token.id as string },
          include: {
            businessProfile: { select: { id: true } },
            empresas: { select: { businessProfileId: true } },
          },
        });
        if (provider) {
          token.hasProfile = !!provider.businessProfile;
          token.businessProfileId =
            provider.businessProfile?.id ??
            provider.empresas[0]?.businessProfileId ??
            null;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as { rol?: string }).rol = token.rol as string;
      (session.user as { hasProfile?: boolean }).hasProfile = token.hasProfile as boolean;
      (session.user as { businessProfileId?: string | null }).businessProfileId = token.businessProfileId as string | null;
      (session.user as { pendingStep?: string | null }).pendingStep =
        token.hasProfile ? null : "business";
      return session;
    },
  },
});
