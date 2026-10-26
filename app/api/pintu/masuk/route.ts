import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { accessIsOwned, originAllowed, siteOrigin } from "@/lib/pintu-guard";
import { pintuRedirectLocation, signPintuToken } from "@/lib/pintu-token";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const sessionAccountId = session?.user?.id;
  if (!sessionAccountId) {
    return plain(401, "Masuk diperlukan.");
  }

  const expectedOrigin = siteOrigin(request.url, process.env.NEXTAUTH_URL);
  if (!originAllowed(request.headers.get("origin"), expectedOrigin)) {
    return plain(403, "Permintaan ditolak.");
  }

  let accessId = "";
  try {
    const form = await request.formData();
    const value = form.get("accessId");
    accessId = typeof value === "string" ? value.trim() : "";
  } catch {
    return plain(400, "Permintaan tidak valid.");
  }

  if (!accessId) {
    return plain(400, "Permintaan tidak valid.");
  }

  const access = await prisma.pintuAccess.findUnique({
    where: { id: accessId },
    include: {
      account: {
        select: { id: true, email: true, active: true },
      },
    },
  });

  if (!access || !accessIsOwned(access, sessionAccountId)) {
    return plain(403, "Permintaan ditolak.");
  }

  if (!access.account.active) {
    return plain(403, "Permintaan ditolak.");
  }

  let audience: string;
  try {
    const url = new URL(access.erpUrl);
    if (url.protocol !== "https:") {
      return plain(400, "Alamat bisnis tidak valid.");
    }
    audience = url.origin;
  } catch {
    return plain(400, "Alamat bisnis tidak valid.");
  }

  const privateKey = process.env.PINTU_PRIVATE_KEY ?? "";
  if (!privateKey.trim()) {
    console.error("PINTU_PRIVATE_KEY kosong.");
    return plain(500, "Konfigurasi pintu belum lengkap.");
  }

  let token: string;
  try {
    token = await signPintuToken({
      privateKeyPem: privateKey,
      email: access.account.email,
      audience,
    });
  } catch (error) {
    console.error(
      "Gagal menandatangani kode pintu.",
      error instanceof Error ? error.name : "Error",
    );
    return plain(500, "Konfigurasi pintu belum lengkap.");
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: pintuRedirectLocation(audience, token),
      "Cache-Control": "no-store",
    },
  });
}

function plain(status: number, message: string) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
