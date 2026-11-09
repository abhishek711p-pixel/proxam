import "server-only";
import { cache } from "react";
import { currentUser } from "./auth";
import { activeEnrollment } from "./batch";
import { noticesForUser } from "./store";
import type { Notice, User } from "./types";

// One slot per request for the header's notices.
const slot = cache(() => ({ p: undefined as Promise<Notice[]> | undefined }));

function start(u: User) {
  const s = slot();
  if (!s.p) {
    s.p = noticesForUser(u, Boolean(activeEnrollment(u)));
    s.p.catch(() => {}); // the header reports errors when it awaits
  }
  return s.p;
}

/**
 * The logged-in student for a page that shows the site header.
 * Starts loading the header's notices at once, so they arrive in parallel with the page's own data
 * instead of one database round trip after it.
 */
export const pageUser = cache(async () => {
  const u = await currentUser();
  if (u) start(u);
  return u;
});

/** Header notices: the request's prefetched list, or a fresh load. */
export function headerNotices(u: User) {
  return start(u);
}
