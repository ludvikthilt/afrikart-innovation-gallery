import { TopBar } from "@/components/layout/top-bar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <main id="contenu" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
