import { isAdmin } from "@/lib/auth";
import { fail } from "@/lib/http";
import { studentRowsAll } from "@/lib/adminData";
import { toCSV } from "@/lib/csv";

/** CSV of the filtered students, streamed 1,000 rows at a time (works for lakhs of rows). */
export async function GET(req: Request) {
  if (!(await isAdmin())) return fail("Unauthorised", 401);
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const enc = new TextEncoder();
  const header = ["Name", "Mobile", "Email", "Class", "Field", "School", "City", "Board", "Goal", "Signed up", "Attempts", "Latest %", "Best %", "Level", "Weak subjects", "Call status", "Call at", "Batch", "Batch name", "Batch amount (₹)", "Batch joined on", "Roadmap %", "Steps behind", "Paid tests", "Paid tests amount (₹)"];
  const stream = new ReadableStream({
    async start(ctrl) {
      ctrl.enqueue(enc.encode(toCSV([header])));
      for await (const rows of studentRowsAll(sp)) {
        if (!rows.length) continue;
        const csv = "\r\n" + toCSV(
          rows.map((r) => [
            r.name, r.mobile, r.email, r.cls, r.fieldLabel, r.school, r.city, r.board, r.goal, r.createdAt,
            r.attempts, r.latest?.percentage, r.best, r.latest?.level, r.latest?.weak.join("; "), r.callStatus, r.callAt, r.batch, r.batchName, r.batchAmount, r.batchJoined, r.progress, r.behind, r.paidTests, r.paidTestAmount,
          ]),
          false,
        );
        ctrl.enqueue(enc.encode(csv));
      }
      ctrl.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
