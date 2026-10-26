"use server";

import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { isDeveloperAccount, isHttpsOrigin } from "@/lib/pintu-guard";
import { prisma } from "@/lib/prisma";

const BCRYPT_COST = 12;

const createAccountSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value.length === 0 ? null : value)),
  password: z.string().min(8),
});

const passwordSchema = z.object({
  accountId: z.string().trim().min(1),
  password: z.string().min(8),
});

const accountIdSchema = z.object({
  accountId: z.string().trim().min(1),
});

const accessSchema = z.object({
  accountId: z.string().trim().min(1),
  businessName: z.string().trim().min(1).max(120),
  erpUrl: z.string().trim().min(1),
});

const deleteAccessSchema = z.object({
  accessId: z.string().trim().min(1),
});

async function requireDeveloper() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    notFound();
  }

  const account = await prisma.pintuAccount.findUnique({
    where: { id: session.user.id },
    select: { id: true, isDeveloper: true, active: true },
  });

  if (!isDeveloperAccount(account)) {
    notFound();
  }

  return account;
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function fail(code: string): never {
  redirect(`/business/admin?error=${code}`);
}

function done(code: string): never {
  revalidatePath("/business/admin");
  revalidatePath("/business");
  redirect(`/business/admin?notice=${code}`);
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function createAccount(formData: FormData) {
  await requireDeveloper();

  const parsed = createAccountSchema.safeParse({
    email: field(formData, "email"),
    name: field(formData, "name"),
    password: field(formData, "password"),
  });

  if (!parsed.success) {
    const key = parsed.error.issues[0]?.path[0];
    if (key === "password") {
      fail("sandi-pendek");
    }
    if (key === "email") {
      fail("email-tidak-valid");
    }
    fail("data-tidak-valid");
  }

  try {
    await prisma.pintuAccount.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash: await bcrypt.hash(parsed.data.password, BCRYPT_COST),
        isDeveloper: false,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      fail("email-sudah-ada");
    }
    throw error;
  }

  done("akun-dibuat");
}

export async function resetPassword(formData: FormData) {
  await requireDeveloper();

  const parsed = passwordSchema.safeParse({
    accountId: field(formData, "accountId"),
    password: field(formData, "password"),
  });

  if (!parsed.success) {
    const key = parsed.error.issues[0]?.path[0];
    fail(key === "password" ? "sandi-pendek" : "data-tidak-valid");
  }

  const updated = await prisma.pintuAccount.updateMany({
    where: { id: parsed.data.accountId },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, BCRYPT_COST),
    },
  });

  if (updated.count === 0) {
    fail("akun-tidak-ada");
  }

  done("sandi-diperbarui");
}

export async function setAccountActive(formData: FormData) {
  await requireDeveloper();

  const parsed = accountIdSchema.safeParse({
    accountId: field(formData, "accountId"),
  });
  const active = field(formData, "active");

  if (!parsed.success || (active !== "true" && active !== "false")) {
    fail("data-tidak-valid");
  }

  const updated = await prisma.pintuAccount.updateMany({
    where: { id: parsed.data.accountId },
    data: { active: active === "true" },
  });

  if (updated.count === 0) {
    fail("akun-tidak-ada");
  }

  done("status-diperbarui");
}

export async function resetAccountLock(formData: FormData) {
  await requireDeveloper();

  const parsed = accountIdSchema.safeParse({
    accountId: field(formData, "accountId"),
  });

  if (!parsed.success) {
    fail("data-tidak-valid");
  }

  const updated = await prisma.pintuAccount.updateMany({
    where: { id: parsed.data.accountId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  if (updated.count === 0) {
    fail("akun-tidak-ada");
  }

  done("kunci-direset");
}

export async function createAccess(formData: FormData) {
  await requireDeveloper();

  const parsed = accessSchema.safeParse({
    accountId: field(formData, "accountId"),
    businessName: field(formData, "businessName"),
    erpUrl: field(formData, "erpUrl"),
  });

  if (!parsed.success) {
    fail("data-tidak-valid");
  }

  const erpUrl = isHttpsOrigin(parsed.data.erpUrl);
  if (!erpUrl) {
    fail("alamat-tidak-valid");
  }

  const account = await prisma.pintuAccount.findUnique({
    where: { id: parsed.data.accountId },
    select: { id: true },
  });

  if (!account) {
    fail("akun-tidak-ada");
  }

  try {
    await prisma.pintuAccess.create({
      data: {
        accountId: account.id,
        businessName: parsed.data.businessName,
        erpUrl,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      fail("akses-duplikat");
    }
    throw error;
  }

  done("akses-ditambah");
}

export async function deleteAccess(formData: FormData) {
  await requireDeveloper();

  const parsed = deleteAccessSchema.safeParse({
    accessId: field(formData, "accessId"),
  });

  if (!parsed.success) {
    fail("data-tidak-valid");
  }

  const deleted = await prisma.pintuAccess.deleteMany({
    where: { id: parsed.data.accessId },
  });

  if (deleted.count === 0) {
    fail("akses-tidak-ada");
  }

  done("akses-dihapus");
}
