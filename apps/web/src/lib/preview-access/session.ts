const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
};

const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

async function importSessionKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createPreviewSessionToken(secret: string, expiresAtSeconds: number): Promise<string> {
  const expiresAt = String(expiresAtSeconds);
  const signature = await crypto.subtle.sign("HMAC", await importSessionKey(secret), encoder.encode(expiresAt));
  return `${expiresAt}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyPreviewSessionToken(
  token: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1_000)
): Promise<boolean> {
  if (!token) return false;
  const [expiresAtValue, signatureValue, ...rest] = token.split(".");
  const expiresAt = Number(expiresAtValue);
  if (rest.length || !signatureValue || !Number.isInteger(expiresAt) || expiresAt <= nowSeconds) return false;

  try {
    return crypto.subtle.verify(
      "HMAC",
      await importSessionKey(secret),
      fromBase64Url(signatureValue),
      encoder.encode(expiresAtValue)
    );
  } catch {
    return false;
  }
}
