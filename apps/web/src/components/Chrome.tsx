import Link from "next/link";
import { site } from "@/lib/config";

export function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo" aria-label="TapKit home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="" width={32} height={32} />
          TapKit
        </Link>
        <nav className="nav-links" aria-label="Main">
          <a className="hide-sm" href="/#how">How it works</a>
          <a className="hide-sm" href="/#pricing">Pricing</a>
          <a className="hide-sm" href="/#faq">FAQ</a>
          <AppStoreButton small />
        </nav>
      </div>
    </header>
  );
}

export function AppStoreButton({ small, dark }: { small?: boolean; dark?: boolean }) {
  const style = small ? { height: 40, padding: "0 16px", fontSize: 14 } : undefined;
  if (!site.appStoreUrl) {
    return (
      <span className={`btn ${dark ? "btn-dark" : "btn-primary"}`} style={style} aria-disabled="true" title="TapKit is preparing for App Store release">
        Coming soon to iPhone
      </span>
    );
  }
  return (
    <a className={`btn ${dark ? "btn-dark" : "btn-primary"}`} style={style} href={site.appStoreUrl}>
      Download on the App Store
    </a>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>© {new Date().getFullYear()} TapKit. Build your personal brand from zero.</div>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </div>
      </div>
    </footer>
  );
}
