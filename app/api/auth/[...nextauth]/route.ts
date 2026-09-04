import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  isAdmin?: boolean;
  role?: string | null;
  displayName?: string | null;
}

declare module "next-auth" {
  interface Session {
    user: ExtendedUser & { displayName?: string | null };
    accessToken?: string;
  }
  interface User extends ExtendedUser {
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isAdmin?: boolean;
    displayName?: string | null;
    role?: string;
    accessToken?: string;
    image?: string | null;
  }
}

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "credentials",
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials): Promise<ExtendedUser | null> {
      try {
        if (!credentials) return null;

        const email = credentials.email?.toString().toLowerCase().trim();
        const password = credentials.password?.toString();
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!user.passwordHash) {
          throw new Error(
            "This account was created with Google. Please click 'Continue with Google' to sign in."
          );
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.name,
          displayName: user.displayName || user.name,
          image: user.image || null,
          isAdmin: user.role === "ADMIN",
          role: user.role,
        };
      } catch (e) {
        console.error("Authorize error:", e);
        if (e instanceof Error && e.message.includes("Google")) {
          throw e;
        }
        return null;
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
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
  providers,
  events: {
    async createUser({ user }) {
      // Ensure new OAuth users (e.g. Google) have a wallet, profile, and displayName initialized
      try {
        if (user.name) {
          await prisma.user.update({
            where: { id: user.id },
            data: { displayName: user.name },
          });
        }
      } catch (err) {
        console.error("Failed to set displayName for user:", err);
      }

      try {
        const existingWallet = await prisma.wallet.findUnique({
          where: { userId: user.id },
        });
        if (!existingWallet) {
          await prisma.wallet.create({
            data: {
              userId: user.id,
              balance: 0,
              tokens: 5,
            },
          });
        }
      } catch (err) {
        console.error("Failed to initialize wallet for user:", err);
      }

      try {
        const existingProfile = await prisma.profile.findUnique({
          where: { userId: user.id },
        });
        if (!existingProfile) {
          await prisma.profile.create({
            data: {
              userId: user.id,
              analyticsConsent: true,
              marketingConsent: false,
            },
          });
        }
      } catch (err) {
        console.error("Failed to initialize profile for user:", err);
      }
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.sub = user.id;
        token.isAdmin = (user as ExtendedUser).isAdmin ?? ((user as ExtendedUser).role === "ADMIN");
        token.displayName = (user as ExtendedUser).displayName || user.name || null;
        token.role = (user as ExtendedUser).role ?? "USER";
        token.image = user.image || null;
      } else if (token.sub && !token.role) {
        // Hydrate from DB if missing on token
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, displayName: true, name: true, image: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.isAdmin = dbUser.role === "ADMIN";
            token.displayName = dbUser.displayName || dbUser.name || null;
            token.image = dbUser.image || null;
          }
        } catch (e) {
          console.error("Error hydrating user in jwt callback:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (session.user) {
        session.user.id = (token.sub as string) || session.user.id;
        session.user.displayName =
          token.displayName || session.user.name || null;
        session.user.name = token.displayName || session.user.name || null;
        session.user.isAdmin = token.isAdmin ?? false;
        session.user.role =
          typeof token.role === "string" ? token.role : "USER";
        session.user.image = token.image || session.user.image || null;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
