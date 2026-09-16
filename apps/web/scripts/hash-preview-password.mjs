import { randomBytes, scryptSync } from "node:crypto";

const password = process.env.PREVIEW_ACCESS_PASSWORD;
if (!password || password.length < 12) {
  console.error("Set PREVIEW_ACCESS_PASSWORD to a preview password with at least 12 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`);
