import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ padding: "96px 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 40 }}>This portfolio isn&apos;t available</h1>
      <p className="lead" style={{ margin: "16px auto" }}>
        It may have been unpublished or the address may be wrong.
      </p>
      <Link className="btn btn-primary" href="/">
        Go to TapKit
      </Link>
    </main>
  );
}
