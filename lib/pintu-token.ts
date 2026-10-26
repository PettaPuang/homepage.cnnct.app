import { importPKCS8, SignJWT } from "jose";

export const PINTU_ISSUER = "cnnct.app";
export const PINTU_TTL_SECONDS = 60;

export function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

export function pintuRedirectLocation(erpOrigin: string, token: string): string {
  return `${erpOrigin}/pintu#kode=${token}`;
}

export async function signPintuToken(input: {
  privateKeyPem: string;
  email: string;
  audience: string;
  nowSeconds?: number;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const audience = input.audience.trim();
  const privateKeyPem = normalizePem(input.privateKeyPem);

  if (!email || !audience || !privateKeyPem) {
    throw new Error("Klaim pintu tidak lengkap.");
  }

  const iat = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const key = await importPKCS8(privateKeyPem, "ES256");

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256" })
    .setIssuer(PINTU_ISSUER)
    .setAudience(audience)
    .setSubject(email)
    .setIssuedAt(iat)
    .setExpirationTime(iat + PINTU_TTL_SECONDS)
    .sign(key);
}
