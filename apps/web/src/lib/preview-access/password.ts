import "server-only";

import { verifyScryptSecret } from "../security/scrypt";

export async function verifyPreviewPassword(password: string, encodedHash: string): Promise<boolean> {
  return verifyScryptSecret(password, encodedHash);
}
