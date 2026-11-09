import { isAdmin } from "@/lib/auth";
import { body, fail, ok } from "@/lib/http";
import { nowISO } from "@/lib/ids";
import { saveChapterContent } from "@/lib/store";
import { chapterById } from "@/lib/syllabus";
import { youtubeId } from "@/lib/youtube";
import type { ChapterContent } from "@/lib/types";

type Link = { title?: unknown; url?: unknown };
const httpsUrl = (v: unknown) => {
  const s = String(v || "").trim().slice(0, 500);
  if (!s) return "";
  const u = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    return new URL(u).protocol === "https:" ? u : "";
  } catch {
    return "";
  }
};

/** Save the study material of one chapter: YouTube videos, notes PDFs, DPP. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const x = (await body(req)) as { chapterId?: string; videos?: Link[]; notes?: Link[]; dpp?: { pdf?: Link; questions?: { q?: unknown; a?: unknown }[] } };
  const ch = chapterById(String(x.chapterId || ""));
  if (!ch) return fail("Unknown chapter.");

  const videos: ChapterContent["videos"] = [];
  for (const [i, v] of (Array.isArray(x.videos) ? x.videos : []).slice(0, 10).entries()) {
    const url = httpsUrl(v?.url);
    if (!url) continue;
    if (!youtubeId(url)) return fail(`Video ${i + 1}: paste a YouTube video link (youtube.com/watch?v=... or youtu.be/...).`);
    videos.push({ title: String(v?.title || "").trim().slice(0, 120) || `${ch.title}: video ${videos.length + 1}`, url });
  }
  const notes: ChapterContent["notes"] = [];
  for (const [i, n] of (Array.isArray(x.notes) ? x.notes : []).slice(0, 10).entries()) {
    const url = httpsUrl(n?.url);
    if (String(n?.url || "").trim() && !url) return fail(`Notes ${i + 1}: the link must be a full https:// address.`);
    if (url) notes.push({ title: String(n?.title || "").trim().slice(0, 120) || `${ch.title} notes`, url });
  }
  const pdfUrl = httpsUrl(x.dpp?.pdf?.url);
  if (String(x.dpp?.pdf?.url || "").trim() && !pdfUrl) return fail("DPP PDF: the link must be a full https:// address.");
  const questions = (Array.isArray(x.dpp?.questions) ? x.dpp!.questions! : [])
    .map((r) => ({ q: String(r?.q || "").trim().slice(0, 1500), a: String(r?.a || "").trim().slice(0, 1500) || undefined }))
    .filter((r) => r.q)
    .slice(0, 50);

  const empty = !videos.length && !notes.length && !pdfUrl && !questions.length;
  await saveChapterContent(
    ch.id,
    empty
      ? undefined
      : { videos, notes, dpp: { pdf: pdfUrl ? { title: String(x.dpp?.pdf?.title || "").trim().slice(0, 120) || `${ch.title} DPP`, url: pdfUrl } : undefined, questions }, updatedAt: nowISO() },
  );
  return ok({ videos: videos.length, notes: notes.length, dpp: questions.length + (pdfUrl ? 1 : 0) });
}
