import { Footer, Nav } from "./Chrome";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="container section prose">
        <h1 style={{ fontSize: 44 }}>{title}</h1>
        <p className="muted">Last updated {updated}</p>
        {children}
      </main>
      <Footer />
    </>
  );
}
