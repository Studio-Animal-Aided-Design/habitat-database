"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="route-state standalone-state">
      <p className="eyebrow">Verbindung unterbrochen</p>
      <h1>Das Planungswissen konnte nicht geladen werden.</h1>
      <p>Bitte versuchen Sie es erneut. Falls der Fehler bleibt, steht die öffentliche Ausgabe aus dem letzten erfolgreichen Build weiterhin unabhängig zur Verfügung.</p>
      <button className="primary-link" type="button" onClick={reset}>Erneut versuchen</button>
    </main>
  );
}
