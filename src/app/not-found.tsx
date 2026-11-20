import Link from "next/link";

// Requêtes hors de toute langue (rare : le proxy ajoute la langue).
export default function GlobalNotFound() {
  return (
    <html lang="fr">
      <body style={{ background: "#f6f6f4", color: "#0b0c11", fontFamily: "system-ui", padding: "4rem", textAlign: "center" }}>
        <h1>404</h1>
        <Link href="/" style={{ color: "#1f56f5" }}>
          Retour au hall / Back to the hall
        </Link>
      </body>
    </html>
  );
}
