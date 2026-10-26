import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { generateKeyPair, exportPKCS8, exportSPKI, decodeJwt, decodeProtectedHeader, importSPKI, jwtVerify } from "jose";

import { decideLogin, PINTU_LOGIN_LOCK_MS } from "../lib/pintu-login.ts";
import {
  accessIsOwned,
  isDeveloperAccount,
  isHttpsOrigin,
  originAllowed,
} from "../lib/pintu-guard.ts";
import { normalizePem, pintuRedirectLocation, signPintuToken } from "../lib/pintu-token.ts";

const audience = "https://erp.example";
const email = " Owner@Example.com ";
const nowSeconds = 1_700_000_000;

const { privateKey, publicKey } = await generateKeyPair("ES256", {
  extractable: true,
});
const privatePem = await exportPKCS8(privateKey);
const publicPem = await exportSPKI(publicKey);
const oneLinePrivate = privatePem.trim().replace(/\r?\n/g, "\\n");

const token = await signPintuToken({
  privateKeyPem: oneLinePrivate,
  email,
  audience,
  nowSeconds,
});

const header = decodeProtectedHeader(token);
assert(header.alg === "ES256", "alg harus ES256");

const claims = decodeJwt(token);
const claimNames = Object.keys(claims).sort();
assert(
  JSON.stringify(claimNames) === JSON.stringify(["aud", "exp", "iat", "iss", "sub"]),
  `claim tidak sesuai: ${claimNames.join(",")}`,
);
assert(claims.iss === "cnnct.app", "iss");
assert(claims.aud === audience, "aud");
assert(claims.sub === "owner@example.com", "sub");
assert(claims.iat === nowSeconds, "iat");
assert(claims.exp === nowSeconds + 60, "exp");
assert(Number(claims.exp) - Number(claims.iat) === 60, "exp-iat");

const spki = await importSPKI(publicPem, "ES256");
await jwtVerify(token, spki, {
  issuer: "cnnct.app",
  audience,
  algorithms: ["ES256"],
  currentDate: new Date(nowSeconds * 1000),
});

const other = await generateKeyPair("ES256", { extractable: true });
const otherPublic = await importSPKI(await exportSPKI(other.publicKey), "ES256");
let rejected = false;
try {
  await jwtVerify(token, otherPublic, {
    algorithms: ["ES256"],
    currentDate: new Date(nowSeconds * 1000),
  });
} catch {
  rejected = true;
}
assert(rejected, "kunci lain harus menolak");

assert(normalizePem("a\\nb").includes("\n"), "normalisasi pem");

const now = new Date("2026-01-01T00:00:00.000Z");
const fourth = decideLogin({
  account: { failedLoginCount: 4, lockedUntil: null, active: true },
  passwordOk: false,
  now,
});
assert(fourth.result === "reject" && fourth.persist && fourth.failedLoginCount === 5, "kunci pada gagal ke-5");
assert(
  fourth.result === "reject" &&
    fourth.lockedUntil?.getTime() === now.getTime() + PINTU_LOGIN_LOCK_MS,
  "durasi kunci 15 menit",
);

const duringLock = decideLogin({
  account: {
    failedLoginCount: 5,
    lockedUntil: new Date(now.getTime() + 60_000),
    active: true,
  },
  passwordOk: true,
  now,
});
assert(duringLock.result === "reject" && duringLock.persist === false, "terkunci tetap ditolak");

const afterLock = decideLogin({
  account: {
    failedLoginCount: 5,
    lockedUntil: new Date(now.getTime() - 1000),
    active: true,
  },
  passwordOk: true,
  now,
});
assert(afterLock.result === "accept", "kunci kedaluwarsa boleh masuk");

const inactive = decideLogin({
  account: { failedLoginCount: 0, lockedUntil: null, active: false },
  passwordOk: true,
  now,
});
assert(inactive.result === "reject" && inactive.persist === false, "nonaktif ditolak");

const missing = decideLogin({ account: null, passwordOk: false, now });
assert(missing.result === "reject" && missing.persist === false, "akun tidak ada tidak ditulis");

assert(accessIsOwned({ accountId: "a" }, "a"), "akses milik sendiri");
assert(!accessIsOwned({ accountId: "a" }, "b"), "akses milik orang lain");
assert(!accessIsOwned(null, "a"), "akses kosong");
assert(originAllowed("https://cnnct.app", "https://cnnct.app"), "origin sama");
assert(!originAllowed(null, "https://cnnct.app"), "origin hilang");
assert(!originAllowed("https://evil.example", "https://cnnct.app"), "origin beda");
assert(isHttpsOrigin("https://erp.example/pintu") === "https://erp.example", "origin https");
assert(isHttpsOrigin("http://localhost:3000") === null, "http ditolak");
assert(!isDeveloperAccount(null), "tanpa akun");
assert(!isDeveloperAccount({ isDeveloper: false, active: true }), "bukan developer");
assert(!isDeveloperAccount({ isDeveloper: true, active: false }), "developer nonaktif");
assert(isDeveloperAccount({ isDeveloper: true, active: true }), "developer aktif");

const actions = readFileSync(new URL("../app/business/admin/actions.ts", import.meta.url), "utf8");
const actionNames = [...actions.matchAll(/export async function (\w+)/g)].map((match) => match[1]);
assert(actionNames.length >= 6, "jumlah action admin");
for (const name of actionNames) {
  const start = actions.indexOf(`export async function ${name}`);
  const next = actions.indexOf("export async function", start + 1);
  const body = actions.slice(start, next === -1 ? undefined : next);
  assert(body.includes("await requireDeveloper()"), `${name} wajib cek developer`);
}

const route = readFileSync(new URL("../app/api/pintu/masuk/route.ts", import.meta.url), "utf8");
assert(route.includes("accessIsOwned"), "route cek kepemilikan");
assert(route.includes("originAllowed"), "route cek origin");
assert(route.includes("status: 303"), "redirect 303");
assert(route.includes("pintuRedirectLocation"), "route memakai lokasi fragment");
const location = pintuRedirectLocation(audience, token);
assert(location === `${audience}/pintu#kode=${token}`, "lokasi redirect");
assert(!location.includes("?"), "kode bukan query");
assert(route.includes("#kode=") || route.includes("pintuRedirectLocation"), "kode di fragment");

const adminPage = readFileSync(new URL("../app/business/admin/page.tsx", import.meta.url), "utf8");
assert(adminPage.includes("isDeveloperAccount"), "halaman admin cek developer");
assert(adminPage.includes("notFound()"), "bukan developer dapat 404");

const keys = spawnSync(process.execPath, ["scripts/generate-keys.mjs"], {
  encoding: "utf8",
});
assert(keys.status === 0, "keys:generate gagal");
const keyLines = keys.stdout.split(/\r?\n/).filter(Boolean);
assert(keyLines.length === 2, "kunci harus dua baris");
const escapedNewline = "\\n";
assert(
  keyLines[0].startsWith("PINTU_PRIVATE_KEY=") &&
    keyLines[0].includes("BEGIN PRIVATE KEY") &&
    keyLines[0].includes("END PRIVATE KEY") &&
    keyLines[0].includes(escapedNewline),
  "private key satu baris",
);
assert(
  keyLines[1].startsWith("PINTU_PUBLIC_KEY=") &&
    keyLines[1].includes("BEGIN PUBLIC KEY") &&
    keyLines[1].includes("END PUBLIC KEY") &&
    keyLines[1].includes(escapedNewline),
  "public key satu baris",
);

const authSource = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");
assert(authSource.includes("decideLogin"), "login memakai kebijakan gagal");
assert(authSource.includes("compareUnknownPassword"), "akun tidak ada tetap dibanding");
assert(authSource.includes("8 * 60 * 60"), "sesi 8 jam");
assert(authSource.includes('signIn: "/business"'), "halaman masuk");

console.log("pintu token dan penjaga: lulus");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
