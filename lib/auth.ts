import bcrypt from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { decideLogin } from "@/lib/pintu-login";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const dummyPasswordHash = bcrypt.hash("pintu-unknown-account", 12);

async function compareUnknownPassword(password: string) {
  await bcrypt.compare(password, await dummyPasswordHash);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";

        if (!email || !password) {
          await compareUnknownPassword(password || "invalid");
          return null;
        }

        const account = await prisma.pintuAccount.findUnique({
          where: { email },
        });
        const passwordOk = account
          ? await bcrypt.compare(password, account.passwordHash)
          : false;

        if (!account) {
          await compareUnknownPassword(password);
        }

        const decision = decideLogin({
          account: account
            ? {
                failedLoginCount: account.failedLoginCount,
                lockedUntil: account.lockedUntil,
                active: account.active,
              }
            : null,
          passwordOk,
          now: new Date(),
        });

        if (!account || decision.result === "reject") {
          if (account && decision.result === "reject" && decision.persist) {
            await prisma.pintuAccount.update({
              where: { id: account.id },
              data: {
                failedLoginCount: decision.failedLoginCount,
                lockedUntil: decision.lockedUntil,
              },
            });
          }

          return null;
        }

        await prisma.pintuAccount.update({
          where: { id: account.id },
          data: {
            failedLoginCount: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: account.id,
          email: account.email,
          isDeveloper: account.isDeveloper,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/business",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.isDeveloper = user.isDeveloper;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: typeof token.email === "string" ? token.email : "",
        isDeveloper: token.isDeveloper === true,
      };
      return session;
    },
  },
};
