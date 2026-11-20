import Link from "next/link";

// Requêtes hors de toute langue (rare : le proxy ajoute la langue).
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body style={{ background: "#fbf5e8", color: "#17241a", fontFamily: "system-ui", padding: "4rem", textAlign: "center" }}>
        <h1>404</h1>
        <Link href="/" style={{ color: "#1f4d2a" }}>
          Retour au hall / Back to the hall
        </Link>
      </body>
    </html>
  );
}
