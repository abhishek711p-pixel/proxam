import { nowISO } from "@/lib/ids";
import { body, fail, ok } from "@/lib/http";
import { batchStudent } from "@/lib/learnGuard";
import { addDoubtMessage, getDoubt, patchDoubt } from "@/lib/store";

/** Student side of a doubt thread: mark read, mark clear, or ask a follow-up. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await batchStudent();
  if (!s) return fail("session", 401);
  const { id } = await params;
  const d = await getDoubt(id);
  if (!d || d.userId !== s.u.id) return fail("Not found", 404);
  const x = (await body(req)) as { action?: string; text?: string };
  if (x.action === "seen") await patchDoubt(id, { unreadForStudent: false }, false);
  else if (x.action === "clear") await patchDoubt(id, { status: "resolved", unreadForStudent: false });
  else if (x.action === "followup") {
    const text = (x.text || "").trim();
    if (text.length < 5) return fail("Write what is still unclear.");
    await addDoubtMessage(id, { from: "student", text: text.slice(0, 1000), at: nowISO() }, { status: "open" });
  } else return fail("Unknown action.");
  return ok();
}
