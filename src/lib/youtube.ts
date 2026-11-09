/** The 11-letter video id from any normal YouTube link (watch, youtu.be, shorts, embed, live), or undefined. */
export function youtubeId(url: string): string | undefined {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null | undefined;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/);
      if (!id && m) id = m[2];
    }
    return id && /^[\w-]{11}$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

/** Start time from a link like ...?t=90 or &t=1m30s, in seconds. */
export function youtubeStart(url: string): number | undefined {
  try {
    const t = new URL(url).searchParams.get("t") || new URL(url).searchParams.get("start");
    if (!t) return undefined;
    if (/^\d+$/.test(t)) return Number(t);
    const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : undefined;
  } catch {
    return undefined;
  }
}

/** Privacy-friendly embed address (no tracking cookies until the student presses play). */
export function youtubeEmbed(url: string) {
  const id = youtubeId(url);
  if (!id) return undefined;
  const start = youtubeStart(url);
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1${start ? `&start=${start}` : ""}`;
}
