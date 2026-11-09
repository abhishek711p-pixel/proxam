import { allBatches, batchFieldLabel } from "@/lib/batches";
import { studentBrief } from "@/lib/adminData";
import { getUsers, noticeCount, sentNotices } from "@/lib/store";
import Pager from "@/components/admin/Pager";
import { CLASSES, classLabel } from "@/lib/config";
import { audienceLabel } from "@/lib/notices";
import Compose from "./Compose";
import DeleteNotice from "./DeleteNotice";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Batch streams for the audience picker (Class 12 Science: JEE, NEET, Boards PCM, Boards PCB). */
function batchFieldOpts() {
  const m = new Map<string, string[]>();
  for (const b of allBatches()) m.set(b.field, [...(m.get(b.field) || []), b.cls]);
  return [...m].map(([value, classes]) => ({ value, label: batchFieldLabel(value), classes }));
}

export default async function Notifications({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [sent, total, pre] = await Promise.all([sentNotices(50, (page - 1) * 50), noticeCount(), sp.student ? studentBrief(sp.student) : undefined]);
  // names for notices sent to one student
  const direct = await getUsers([...new Set(sent.flatMap((n) => (n.audience.type === "student" ? [n.audience.userId] : [])))]);
  const who = new Map(direct.map((u) => [u.id, { name: u.profile?.name, mobile: u.mobile }]));

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <section className="card self-start">
        <h1 className="text-2xl">Send a notification</h1>
        <p className="mb-4 text-sm text-slate-600">Goes to the bell on the student dashboard.</p>
        <Compose
          classOpts={CLASSES.map((c) => ({ value: c, label: classLabel(c) }))}
          fieldOpts={batchFieldOpts()}
          initialStudent={pre ? { id: pre.id, name: pre.name || pre.mobile, mobile: pre.mobile, cls: pre.cls || "", enrolled: pre.enrolled } : undefined}
          initial={{ to: sp.to || "all", cls: sp.cls || "", field: sp.field || "", student: sp.student || "" }}
        />
      </section>
      <section className="card self-start">
        <h2 className="text-lg">Sent ({total.toLocaleString("en-IN")})</h2>
        {sent.length === 0 && <p className="mt-2 text-sm text-slate-600">Nothing sent yet.</p>}
        <ul className="mt-2 divide-y divide-slate-100">
          {sent.map((n) => (
            <li key={n.id} className="py-3">
              <div className="flex items-start justify-between gap-2">
                <b>{n.title}</b>
                <DeleteNotice id={n.id} />
              </div>
              {n.body && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>}
              {n.link && <p className="mt-1 truncate text-xs text-brand-700">{n.link}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {audienceLabel(n.audience, n.audience.type === "student" ? who.get(n.audience.userId) : undefined)}, {when(n.createdAt)}, seen by {n.readCount.toLocaleString("en-IN")} of {n.recipients.toLocaleString("en-IN")}
              </p>
            </li>
          ))}
        </ul>
        <Pager base="/admin/notifications" params={{}} page={page} hasNext={page * 50 < total} />
      </section>
    </div>
  );
}
