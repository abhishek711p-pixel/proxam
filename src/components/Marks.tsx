/** Hand-drawn teacher marks (amber pen). Purely decorative. */
export function Tick({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 12.8c1.6 1 3.4 3.1 4.8 6.2.4.8 1 .9 1.4.1C12.2 13 15.8 7.6 20.8 3.6" />
    </svg>
  );
}

export function Cross({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M5 5.5c4.4 3.6 9.2 9 13.6 13.4M18.4 4.8C13.6 9.3 9.5 14 5.6 19.2" />
    </svg>
  );
}

/** A loose pen circle drawn around its children. */
export function Circled({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`relative inline-block px-4 py-2 ${className}`}>
      <svg viewBox="0 0 120 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M70 6C38 2 8 13 5 34c-3 22 30 32 62 30 30-2 50-14 48-32C113 13 88 4 52 8" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
