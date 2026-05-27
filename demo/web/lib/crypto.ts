import crypto from "crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.PII_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "PII_ENCRYPTION_KEY missing. Generate with `openssl rand -hex 32` and set in .env",
    );
  }
  if (hex.length !== 64) {
    throw new Error("PII_ENCRYPTION_KEY must be 64 hex chars (32 bytes / 256 bits)");
  }
  return Buffer.from(hex, "hex");
}

/** Encrypt a small PII string. Output: base64 of iv|tag|ciphertext. */
export function encryptPII(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptPII(packed: string): string {
  const key = getKey();
  const buf = Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Mask PAN for safe display: ABCDE1234F → ABC**1234F */
export function maskPAN(pan: string): string {
  if (pan.length !== 10) return "•".repeat(10);
  return `${pan.slice(0, 3)}**${pan.slice(5)}`;
}
