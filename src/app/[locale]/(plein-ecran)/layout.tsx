// Borne, écran de diaporama, cartel imprimable : pas de barre de navigation.
export default function FullscreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenu" className="flex min-h-dvh flex-1 flex-col">
      {children}
    </main>
  );
}
