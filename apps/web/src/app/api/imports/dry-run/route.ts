import { createImportDryRun } from "@/lib/import-api/service";
import { importErrorResponse, noStoreJson, serializeDiagnostics } from "@/lib/import-api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const run = await createImportDryRun(request);
    return noStoreJson({ ok: true, run: { ...run, report: { ...run.report, diagnostics: serializeDiagnostics(run.report.diagnostics) } } }, { status: 201 });
  } catch (error) {
    return importErrorResponse(error);
  }
}
