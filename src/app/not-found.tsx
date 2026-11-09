import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-x flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-6xl font-bold text-accent-500">404</p>
      <p className="text-slate-600">This page does not exist.</p>
      <Link href="/" className="btn-primary">Go home</Link>
    </main>
  );
}
