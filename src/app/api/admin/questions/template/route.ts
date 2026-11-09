import { isAdmin } from "@/lib/auth";
import { fail } from "@/lib/http";
import { toCSV } from "@/lib/csv";
import { CSV_HEADERS } from "@/lib/questionImport";

export async function GET() {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const csv = toCSV([
    CSV_HEADERS,
    ["Physics", "A", "Kinematics", "Equations of motion", "easy", "numerical", "A body starts from rest with acceleration 2 m/s². Distance in 5 s?", "", "10 m", "25 m", "50 m", "20 m", "", "", "", "", "b", "s = ½at² = 25 m", ""],
    ["Career Fit", "C", "Interests", "Career interest", "easy", "interest", "Which would you enjoy most?", "", "Building an app", "Learning about the body", "Running a stall", "Writing a story", "", "", "", "", "", "", "tech|health|business|people"],
  ]);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="question-template.csv"' },
  });
}
