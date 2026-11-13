import { authorizeImportRequest } from "@/lib/import-api/service";
import { importErrorResponse, noStoreJson } from "@/lib/import-api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await authorizeImportRequest(request);
    return noStoreJson({
      ok: true,
      connection: {
        authenticated: true,
        importApiEnabled: true,
      },
    });
  } catch (error) {
    return importErrorResponse(error);
  }
}
