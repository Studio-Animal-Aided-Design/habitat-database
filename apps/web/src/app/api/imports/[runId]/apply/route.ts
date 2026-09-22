import { applyImportRun } from "@/lib/import-api/service";
import { ImportApiError } from "@/lib/import-api/errors";
import { importErrorResponse, noStoreJson, serializeDiagnostics } from "@/lib/import-api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      throw new ImportApiError(415, "unsupported_media_type", "Apply erwartet application/json.");
    }
    const body = await request.json() as { manifestChecksum?: unknown };
    const manifestChecksum = typeof body.manifestChecksum === "string" ? body.manifestChecksum : "";
    const run = await applyImportRun(request, runId, manifestChecksum);
    return noStoreJson({ ok: true, run: { ...run, report: { ...run.report, diagnostics: serializeDiagnostics(run.report.diagnostics) } } });
  } catch (error) {
    return importErrorResponse(error);
  }
}
