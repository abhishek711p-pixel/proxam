import { existsSync, readFileSync } from "fs";

/** Loads .env.local / .env into process.env (scripts run outside Next.js). */
export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  if (!process.env.DATABASE_URL) {
    console.error("\nDATABASE_URL is missing. Add your Neon connection string to .env.local first:\n  DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require\n");
    process.exit(1);
  }
}

export function sslFor(url: string) {
  return /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: true };
}
