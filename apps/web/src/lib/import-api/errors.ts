import type { Diagnostic } from "@aad/database";

export class ImportApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly diagnostics: Diagnostic[] = [],
  ) {
    super(message);
    this.name = "ImportApiError";
  }
}
