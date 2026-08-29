import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.ENCRYPTION_KEY;

export function encrypt(text: string): string {
  if (!KEY_HEX) {
    throw new Error("ENCRYPTION_KEY is not defined in environment.");
  }
  const key = Buffer.from(KEY_HEX, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Combine iv, authTag, and ciphertext separated by colons
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!KEY_HEX) {
    throw new Error("ENCRYPTION_KEY is not defined in environment.");
  }
  const key = Buffer.from(KEY_HEX, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string.");
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format.");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Use any cast to satisfy Node decrypt type signature changes across versions
  let decrypted = decipher.update(encrypted as any, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
