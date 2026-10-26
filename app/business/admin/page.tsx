import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  createAccess,
  createAccount,
  deleteAccess,
  resetAccountLock,
  resetPassword,
  setAccountActive,
} from "@/app/business/admin/actions";
import { LogoutButton } from "@/app/business/logout-button";
import { authOptions } from "@/lib/auth";
import { isDeveloperAccount } from "@/lib/pintu-guard";
import { activeLockLabel } from "@/lib/pintu-login";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelola pintu — CNNCT",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, string> = {
  "akun-dibuat": "Akun dibuat.",
  "sandi-diperbarui": "Password diperbarui.",
  "status-diperbarui": "Status akun diperbarui.",
  "kunci-direset": "Kunci percobaan dihapus.",
  "akses-ditambah": "Akses bisnis ditambahkan.",
  "akses-dihapus": "Akses bisnis dihapus.",
};

const ERRORS: Record<string, string> = {
  "data-tidak-valid": "Data tidak valid. Periksa kembali isian.",
  "email-sudah-ada": "Email itu sudah dipakai.",
  "email-tidak-valid": "Email tidak valid.",
  "sandi-pendek": "Password minimal 8 karakter.",
  "akun-tidak-ada": "Akun tidak ditemukan.",
  "akses-duplikat": "Akun ini sudah punya akses ke alamat ERP itu.",
  "akses-tidak-ada": "Baris akses tidak ditemukan.",
  "alamat-tidak-valid": "Alamat ERP harus https yang valid.",
};

export default async function PintuAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    notFound();
  }

  const developer = await prisma.pintuAccount.findUnique({
    where: { id: session.user.id },
    select: { isDeveloper: true, active: true },
  });

  if (!isDeveloperAccount(developer)) {
    notFound();
  }

  const params = await searchParams;
  const accounts = await prisma.pintuAccount.findMany({
    orderBy: { email: "asc" },
    include: { accesses: { orderBy: { businessName: "asc" } } },
  });
  const notice = params.notice ? NOTICES[params.notice] : undefined;
  const error = params.error ? ERRORS[params.error] : undefined;

  return (
    <main className="pintu pintu-admin">
      <Image
        className="pintu-mark"
        src="/icon/CNNCT Logotype Black.png"
        alt="cnnct.app"
        width={2576}
        height={494}
      />
      <h1>Kelola pintu</h1>
      <div className="pintu-toolbar">
        <a href="/business">Kembali ke daftar bisnis</a>
        <LogoutButton />
      </div>
      {notice ? <p className="pintu-note">{notice}</p> : null}
      {error ? <p className="pintu-error">{error}</p> : null}

      <section>
        <h2>Buat akun</h2>
        <form action={createAccount}>
          <label>
            <span className="pintu-label">Email</span>
            <input name="email" type="email" autoComplete="off" required />
          </label>
          <label>
            <span className="pintu-label">Nama</span>
            <input name="name" type="text" autoComplete="off" />
          </label>
          <label>
            <span className="pintu-label">Password, minimal 8 karakter</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button type="submit">Buat akun</button>
        </form>
      </section>

      <section>
        <h2>Tambah akses</h2>
        <form action={createAccess}>
          <label>
            <span className="pintu-label">Akun</span>
            <select name="accountId" required defaultValue="">
              <option value="" disabled>
                Pilih akun
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="pintu-label">Nama bisnis</span>
            <input name="businessName" type="text" required />
          </label>
          <label>
            <span className="pintu-label">Alamat ERP</span>
            <input
              name="erpUrl"
              type="url"
              inputMode="url"
              placeholder="https://bisnis.example"
              required
            />
          </label>
          <button type="submit">Tambah akses</button>
        </form>
      </section>

      <section>
        <h2>Akun</h2>
        {accounts.length === 0 ? <p>Belum ada akun.</p> : null}
        {accounts.map((account) => {
          const lockLabel = activeLockLabel(account.lockedUntil);

          return (
            <article key={account.id} className="pintu-account">
              <header>
                <h3>{account.email}</h3>
                <p>
                  {account.name ? `${account.name} · ` : null}
                  {account.isDeveloper ? "Developer · " : null}
                  {account.active ? "Aktif" : "Nonaktif"}
                  {lockLabel ? ` · Terkunci sampai ${lockLabel}` : null}
                  {account.failedLoginCount > 0
                    ? ` · Gagal ${account.failedLoginCount}`
                    : null}
                </p>
              </header>

              <form action={resetPassword}>
                <input type="hidden" name="accountId" value={account.id} />
                <label>
                  <span className="pintu-label">Password baru</span>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <button type="submit">Reset password</button>
              </form>

              <form action={setAccountActive}>
                <input type="hidden" name="accountId" value={account.id} />
                <input
                  type="hidden"
                  name="active"
                  value={account.active ? "false" : "true"}
                />
                <button className="pintu-button-quiet" type="submit">
                  {account.active ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </form>

              <form action={resetAccountLock}>
                <input type="hidden" name="accountId" value={account.id} />
                <button className="pintu-button-quiet" type="submit">
                  Reset kunci
                </button>
              </form>

              {account.accesses.length === 0 ? (
                <p>Belum ada akses.</p>
              ) : (
                <ul className="pintu-access-list">
                  {account.accesses.map((access) => (
                    <li key={access.id}>
                      <div>
                        <strong>{access.businessName}</strong>
                        <span>{access.erpUrl}</span>
                      </div>
                      <form action={deleteAccess}>
                        <input type="hidden" name="accessId" value={access.id} />
                        <button className="pintu-button-quiet" type="submit">
                          Hapus
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
