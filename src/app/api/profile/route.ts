import { currentUser } from "@/lib/auth";
import { BOARDS, CLASSES, FIELDS, TARGET_GOALS, type ClassLevel, type FieldId } from "@/lib/config";
import { nowISO } from "@/lib/ids";
import { setProfile } from "@/lib/store";
import { body, fail, ok, str } from "@/lib/http";
import type { Profile } from "@/lib/types";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return fail("Please log in again.", 401);
  const b = await body(req);

  const cls = str(b.cls, 10) as ClassLevel;
  const field = str(b.field, 30) as FieldId;
  const f = FIELDS[field];
  const name = str(b.name, 80);
  const school = str(b.school, 120);
  const city = str(b.city, 60);
  const board = str(b.board, 30);
  const targetGoal = str(b.targetGoal, 60);
  const mobile = str(b.mobile, 10);
  const language = b.language === "hi" ? "hi" : "en";

  if (!CLASSES.includes(cls) || !f || !f.classes.includes(cls)) return fail("Choose a valid class and field.");
  if (!name || !school || !city) return fail("Please fill all required fields.");
  if (!BOARDS.includes(board) || !TARGET_GOALS.includes(targetGoal)) return fail("Choose your board and goal.");
  if (!/^[6-9]\d{9}$/.test(mobile)) return fail("Enter a valid 10-digit Indian mobile number.");
  if (b.consent !== true) return fail("Please tick the box to agree.");

  const now = nowISO();
  const profile: Profile = {
    name,
    cls,
    stream: f.stream,
    field,
    school,
    city,
    board,
    targetGoal,
    language,
    email: user.email || undefined,
    consentAt: now,
  };
  await setProfile(user.id, profile, mobile);

  const res = ok({ next: "/dashboard" });
  res.cookies.set("lang", language, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return res;
}
