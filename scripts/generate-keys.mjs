import { exportPKCS8, exportSPKI, generateKeyPair } from "jose";

const { privateKey, publicKey } = await generateKeyPair("ES256", {
  extractable: true,
});
const privatePem = await exportPKCS8(privateKey);
const publicPem = await exportSPKI(publicKey);

console.log(`PINTU_PRIVATE_KEY=${oneLine(privatePem)}`);
console.log(`PINTU_PUBLIC_KEY=${oneLine(publicPem)}`);

function oneLine(pem) {
  return pem.trim().replace(/\r?\n/g, "\\n");
}
