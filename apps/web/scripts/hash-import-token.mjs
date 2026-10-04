import { randomBytes, scryptSync } from "node:crypto";

const token = process.env.AAD_IMPORT_API_TOKEN;
if (!token || token.length < 24) {
  console.error("Set AAD_IMPORT_API_TOKEN to a random import token with at least 24 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(token, salt, 64);
console.log(`scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`);
