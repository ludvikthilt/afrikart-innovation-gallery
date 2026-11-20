/** Écrans d'authentification : une colonne calme, centrée, sous un halo. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_50%_0%,var(--spotlight),transparent_70%)]"
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
