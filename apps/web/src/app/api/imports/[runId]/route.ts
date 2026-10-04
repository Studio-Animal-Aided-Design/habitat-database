import { getImportStatus } from "@/lib/import-api/service";
import { importErrorResponse, noStoreJson, serializeDiagnostics } from "@/lib/import-api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await context.params;
    const run = await getImportStatus(request, runId);
    return noStoreJson({ ok: true, run: { ...run, report: { ...run.report, diagnostics: serializeDiagnostics(run.report.diagnostics) } } });
  } catch (error) {
    return importErrorResponse(error);
  }
}
