import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

loadEnvFile(resolve(process.cwd(), ".env"));

const email = process.env.DEVELOPER_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.DEVELOPER_PASSWORD ?? "";
const name = process.env.DEVELOPER_NAME?.trim() || null;

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL wajib diisi.");
  process.exit(1);
}

if (!email || !password) {
  console.error("DEVELOPER_EMAIL dan DEVELOPER_PASSWORD wajib diisi.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("DEVELOPER_PASSWORD minimal 8 karakter.");
  process.exit(1);
}

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const bcrypt = await import("bcrypt");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL.trim() }),
});

try {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.pintuAccount.upsert({
    where: { email },
    update: {
      passwordHash,
      name,
      isDeveloper: true,
      active: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email,
      name,
      passwordHash,
      isDeveloper: true,
      active: true,
    },
  });
  console.log(`Akun developer siap: ${email}`);
} finally {
  await prisma.$disconnect();
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}
