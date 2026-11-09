import { isAdmin } from "@/lib/auth";
import { saveQuestions } from "@/lib/store";
import { body, fail, ok } from "@/lib/http";
import { importQuestions } from "@/lib/questionImport";

export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const b = await body<{ csv: string }>(req);
  if (typeof b.csv !== "string" || b.csv.length > 5_000_000) return fail("Upload a CSV file (max 5 MB).");
  const { questions, errors } = importQuestions(b.csv);
  if (errors.length) return fail(errors.slice(0, 20).join("\n"));
  await saveQuestions(questions);
  return ok({ added: questions.length });
}
