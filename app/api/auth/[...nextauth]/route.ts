import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  guest?: boolean;
  role?: string | null;
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser & { displayName?: string | null };
    accessToken?: string;
  }
  interface User extends ExtendedUser {
    // augmentation: ensure isAdmin & guest propagate
    isAdmin?: boolean;
    guest?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
    guest?: boolean;
    displayName?: string | null;
    role?: string;
    accessToken?: string;
  }
}

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mode: { label: "Mode", type: "text" },
      },
      async authorize(credentials): Promise<ExtendedUser | null> {
        try {
          if (!credentials) return null;
          const mode = (credentials.mode || "email").toString();

          if (mode === "guest") {
            // Create an ephemeral guest user
            const guestName = `Guest ${Math.floor(
              1000 + Math.random() * 9000,
            )}`;
            const user = await prisma.user.create({
              data: {
                guest: true,
                displayName: guestName,
                name: guestName,
              },
            });
            return {
              id: user.id,
              email: user.email,
              name: user.displayName,
              image: null,
              isAdmin: user.role === "ADMIN",
              guest: true,
              role: user.role,
            };
          }

          const email = credentials.email?.toString().toLowerCase();
          const password = credentials.password?.toString();
          if (!email || !password) return null;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.displayName,
            image: null,
            isAdmin: user.role === "ADMIN",
            guest: !!user.guest,
            role: user.role,
          };
        } catch (e) {
          console.error("Authorize error:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.isAdmin = (user as ExtendedUser).isAdmin ?? false;
        token.guest = (user as ExtendedUser).guest ?? false;
        token.displayName = (user as ExtendedUser).name ?? null;
        token.role = (user as ExtendedUser).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = (token.sub as string) || session.user.id;
        session.user.displayName =
          token.displayName || session.user.name || null;
        session.user.isAdmin = token.isAdmin ?? false;
        session.user.guest = token.guest ?? false;
        session.user.role =
          typeof token.role === "string" ? token.role : "USER";
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
