import Image from "next/image";
import { redirect } from "next/navigation";
import { resolvePreviewAccessConfig, sanitizePreviewReturnTo } from "@/lib/preview-access/config";

type PreviewAccessPageProps = {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
};

export default async function PreviewAccessPage({ searchParams }: PreviewAccessPageProps) {
  const config = resolvePreviewAccessConfig();
  if (!config.enabled) {
    redirect("/");
  }

  const params = await searchParams;
  const returnTo = sanitizePreviewReturnTo(params.returnTo);

  return (
    <main className="preview-access-shell">
      <section className="preview-access-card" aria-labelledby="preview-access-title">
        <Image src="/logo.webp" alt="Studio Animal-Aided Design" width={300} height={154} className="preview-access-logo" priority />
        <p className="preview-access-eyebrow">Geschützte Projektvorschau</p>
        <h1 id="preview-access-title">Habitat-Datenbank</h1>
        <p>
          Diese Vorschau ist noch nicht öffentlich. Bitte geben Sie das vereinbarte Passwort ein.
        </p>
        <form action="/preview-access/login" method="post" className="preview-access-form">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor="password">Passwort</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={12}
            maxLength={512}
            required
            autoFocus
          />
          {params.error === "invalid" ? (
            <p className="preview-access-error" role="alert">Das Passwort ist nicht korrekt.</p>
          ) : null}
          <button type="submit">Vorschau öffnen</button>
        </form>
      </section>
    </main>
  );
}
