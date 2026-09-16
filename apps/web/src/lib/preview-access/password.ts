import "server-only";

import { scrypt, timingSafeEqual } from "node:crypto";

const decode = (value: string) => Buffer.from(value, "base64url");

export async function verifyPreviewPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, saltValue, hashValue, ...rest] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue || rest.length) return false;

  try {
    const expected = decode(hashValue);
    const actual = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, decode(saltValue), expected.length, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      });
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
