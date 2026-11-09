export function safeNext(v?: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : undefined;
}
