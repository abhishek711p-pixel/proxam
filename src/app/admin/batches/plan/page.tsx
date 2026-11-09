import Link from "next/link";
import { activeEnrollment } from "@/lib/batch";
import { batchGroups, batchSize, batchUserIds } from "@/lib/adminData";
import { batchTasks, getBatchPlans, scopeFor } from "@/lib/store";
import { buildLearnData } from "@/lib/learn";
import { nextWeekLabel, syllabusGroups } from "@/lib/planAdmin";
import { TestSyllabus, WeekAccess } from "@/components/admin/RoadmapAccess";
import { type ClassLevel } from "@/lib/config";
import { allBatches, batchLabel, isValidBatch, type BatchField } from "@/lib/batches";
import { dayKey } from "@/lib/learn";
import { batchPlanView, chapterOpts, subjectOpts } from "@/lib/planAdmin";
import { PlanSettings, PlanWeeks } from "@/components/admin/PlanEditor";

export default async function BatchPlan({ searchParams }: { searchParams: Promise<{ cls?: string; field?: string }> }) {
  const sp = await searchParams;
  const cls = sp.cls as ClassLevel;
  const field = sp.field as BatchField;
  const valid = isValidBatch(cls, field);

  if (!valid) {
    const counts = new Map((await batchGroups()).map((g) => [`${g.cls}|${g.field}`, g.n]));
    return (
      <div className="space-y-4">
        <h1 className="text-2xl">Batch roadmap</h1>
        <p className="text-sm text-slate-600">Pick a batch. What you add here goes to every student in it.</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {allBatches().map(({ cls: c, field: f }) => {
            const n = counts.get(`${c}|${f}`) || 0;
            return (
              <Link key={`${c}${f}`} href={`/admin/batches/plan?cls=${c}&field=${f}`} className="card block hover:border-brand-400">
                <b>{batchLabel(c, f)}</b>
                <p className="text-sm text-slate-600">{n} enrolled</p>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const key = `${cls}|${field}`;
  const [plans, tasks, count] = await Promise.all([getBatchPlans([key]), batchTasks(cls, field), batchSize(cls, field)]);
  // one student of the batch, to show test dates and the automatic syllabus
  const firstId = (await batchUserIds(cls, field))[0];
  const sdb = firstId ? await scopeFor([firstId]) : undefined;
  const su = sdb?.users[0];
  const senr = su && activeEnrollment(su);
  const sample = su && senr ? buildLearnData(sdb!, su, senr, "en", Date.now(), true) : undefined;
  const v = batchPlanView(plans[key] || {}, tasks, cls, field, Date.now(), sample);
  return (
    <div className="space-y-4">
      <Link href="/admin/batches" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
        All batches
      </Link>
      <div>
        <h1 className="text-2xl">
          Roadmap for {batchLabel(cls, field)}
        </h1>
        <p className="text-sm text-slate-600">
          {count} student{count === 1 ? "" : "s"} enrolled. Everything here shows up for all of them, and for students who join later. To change one student only, open their page.
        </p>
        <Link href="/admin/content" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
          Add YouTube videos, notes and DPP to chapters (Study material)
        </Link>
      </div>
      <section className="card">
        <WeekAccess target={{ cls, field }} isBatch status={v.releaseStatus} nextWeekLabel={nextWeekLabel()} />
      </section>
      <section className="card">
        <h2 className="text-lg">Week by week</h2>
        <p className="mb-4 text-sm text-slate-600">Topics, question sets, revision days and batch meetings (like a weekly live class). Each student&apos;s own chapters still follow their start date.</p>
        <PlanWeeks target={{ cls, field }} isBatch weeks={v.weeks} initialWeek={v.initialWeek} tasks={v.tasks} subjects={subjectOpts(field)} today={dayKey(Date.now())} />
      </section>
      <section className="card">
        <h2 className="text-lg">Test syllabus for the batch</h2>
        <p className="mb-3 text-sm text-slate-600">Which chapters each checkpoint test covers. Dates shown are for one student of the batch; set a date to fix it for everyone.</p>
        <TestSyllabus target={{ cls, field }} isBatch tests={v.tests} subjects={syllabusGroups(cls, field)} />
      </section>
      <section className="card">
        <h2 className="mb-4 text-lg">Batch settings</h2>
        <PlanSettings
          target={{ cls, field }}
          isBatch
          batchCount={count}
          endDate={v.endDate}
          defaultEndLabel="3 weeks before the exam"
          order={v.order}
          subjects={subjectOpts(field)}
          skipped={v.skipped}
          chapterOpts={chapterOpts(cls, field, v.allSkip)}
        />
      </section>
    </div>
  );
}
