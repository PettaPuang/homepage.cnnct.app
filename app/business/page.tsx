import type { Metadata } from "next";
import Image from "next/image";
import { getServerSession } from "next-auth";

import { LogoutButton } from "@/app/business/logout-button";
import { LoginForm } from "@/app/business/login-form";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "cnnct.app business account",
  description: "Akun bisnis cnnct.app",
  robots: { index: false, follow: false },
};

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <main className="pintu">
        <Image
          className="pintu-mark"
          src="/icon/CNNCT Logotype Black.png"
          alt="cnnct.app"
          width={2576}
          height={494}
        />
        <h1>business account</h1>
        <LoginForm
          initialError={
            params.error ? "Email atau password salah." : undefined
          }
        />
      </main>
    );
  }

  const account = await prisma.pintuAccount.findUnique({
    where: { id: session.user.id },
    include: {
      accesses: { orderBy: { businessName: "asc" } },
    },
  });

  if (!account || !account.active) {
    return (
      <main className="pintu">
        <Image
          className="pintu-mark"
          src="/icon/CNNCT Logotype Black.png"
          alt="cnnct.app"
          width={2576}
          height={494}
        />
        <h1>business account</h1>
        <p>Akun ini tidak dapat dipakai.</p>
        <LogoutButton />
      </main>
    );
  }

  return (
    <main className="pintu">
      <Image
        className="pintu-mark"
        src="/icon/CNNCT Logotype Black.png"
        alt="cnnct.app"
        width={2576}
        height={494}
      />
      <h1>business account</h1>
      <div className="pintu-toolbar">
        <p>{account.email}</p>
        <div className="pintu-toolbar-actions">
          {account.isDeveloper ? (
            <a className="pintu-button-quiet" href="/business/admin">
              Kelola pintu
            </a>
          ) : null}
          <LogoutButton />
        </div>
      </div>
      {account.accesses.length === 0 ? (
        <p>Belum ada bisnis pada akun ini.</p>
      ) : (
        <div className="pintu-cards">
          {account.accesses.map((access) => (
            <form key={access.id} method="POST" action="/api/pintu/masuk">
              <input type="hidden" name="accessId" value={access.id} />
              <button className="pintu-card-button" type="submit">
                <span>{access.businessName}</span>
                <span className="pintu-label">{hostOf(access.erpUrl)}</span>
              </button>
            </form>
          ))}
        </div>
      )}
    </main>
  );
}

function hostOf(erpUrl: string) {
  try {
    return new URL(erpUrl).host;
  } catch {
    return erpUrl;
  }
}
