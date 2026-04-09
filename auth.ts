import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
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
          where: { email },
          include: { businessProfile: true },
        });

        if (!provider) return null;

        const passwordMatch = await bcrypt.compare(password, provider.hashedPassword);
        if (!passwordMatch) return null;

        return {
          id: provider.id,
          name: provider.name,
          email: provider.email,
          hasProfile: !!provider.businessProfile,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.hasProfile = (user as { hasProfile?: boolean }).hasProfile ?? false;
      }
      if (trigger === "update" && token.id) {
        const profile = await prisma.businessProfile.findUnique({
          where: { serviceProviderId: token.id as string },
          select: { id: true },
        });
        token.hasProfile = !!profile;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as { hasProfile?: boolean }).hasProfile = token.hasProfile as boolean;
      return session;
    },
  },
});
