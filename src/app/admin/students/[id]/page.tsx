import Link from "next/link";
import { notFound } from "next/navigation";
import { scopeFor } from "@/lib/store";
import { activeEnrollment, activeEnrollments } from "@/lib/batch";
import { BOARDS, CLASSES, FIELDS, FREE_ATTEMPTS, classLabel } from "@/lib/config";
import { batchLabel, batchOf, batchOfEnrollment, batchOptions, batchPrice } from "@/lib/batches";
import { learnSummary } from "@/lib/learn";
import { chaptersFor, SUBJECT_NAME, type SubjectKey } from "@/lib/syllabus";
import { attemptsLeft } from "@/lib/testEngine";
import { mcAudience } from "@/lib/masterclass";
import { BatchControls, ChapterRow, ProfileForm, SmallAction, SubjectButtons } from "./StudentActions";
import { PlanSettings, PlanWeeks } from "@/components/admin/PlanEditor";
import { chapterOpts, nextWeekLabel, studentPlanView, subjectOpts, syllabusGroups } from "@/lib/planAdmin";
import { TestSyllabus, WeekAccess } from "@/components/admin/RoadmapAccess";
import { dayKey } from "@/lib/learn";
import DeleteStudentButton from "@/components/admin/DeleteStudentButton";

const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Never";
const day = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await scopeFor([id]);
  const u = db.users[0];
  if (!u) notFound();
  const p = u.profile;
  const enr = activeEnrollment(u);
  const sm = learnSummary(db, u);
  const attempts = db.attempts.filter((a) => a.userId === u.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const calls = db.bookings.filter((b) => b.userId === u.id).sort((a, b) => b.slotStart.localeCompare(a.slotStart));
  const doubts = db.doubts.filter((d) => d.userId === u.id);
  const seats = (u.masterclassSeats || []).map((s) => ({ s, m: db.masterclasses.find((m) => m.id === s.masterclassId) }));
  const done = u.learn?.done || {};
  const bt = p ? batchOf(u) : undefined; // Class 12 Science: JEE / NEET / Boards batch
  const chapters = bt ? chaptersFor(bt.cls, bt.field) : undefined;
  const batchOpts = p ? batchOptions(p.cls, p.field).map((f) => ({ value: f, label: batchLabel(p.cls, f), price: batchPrice(p.cls, f) })) : [];
  const pv = p && enr ? studentPlanView(db, u, enr) : undefined;
  // a student can be in several batches; everything on this page is about the "current" one (open on their dashboard)
  const mine = activeEnrollments(u).map((e) => ({ e, b: batchOfEnrollment(e, u) }));
  const addable = batchOpts.filter((o) => !mine.some((m) => m.b.field === o.value));

  return (
    <div className="space-y-4">
      <Link href="/admin/students" className="text-sm font-semibold text-brand-700 underline underline-offset-4">
        All students
      </Link>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl">{p?.name || "No profile yet"}</h1>
            <p className="text-slate-600">
              {[u.mobile, u.email].filter(Boolean).join(" · ")}
              {p && `, ${classLabel(p.cls)}, ${FIELDS[p.field].label.en}, ${p.board}, ${p.city}`}
            </p>
            <p className="text-sm text-slate-500">Signed up {when(u.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {u.mobile && (
              <a className="btn-ghost btn-sm" href={`https://wa.me/91${u.mobile}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
            <Link className="btn-primary btn-sm" href={`/admin/notifications?to=student&student=${u.id}`}>
              Send notification
            </Link>
            <DeleteStudentButton id={u.id} name={p?.name || u.mobile || "this student"} redirectOnDelete="/admin/students" label="Delete Lead" />
          </div>
        </div>
      </section>

      {p && (
        <section className="card">
          <h2 className="text-lg">Profile</h2>
          <div className="mt-3">
            <ProfileForm
              id={u.id}
              initial={{ name: p.name, cls: p.cls, field: p.field, board: p.board, city: p.city, school: p.school || "" }}
              classOpts={CLASSES.map((c) => ({ value: c, label: classLabel(c) }))}
              fieldOpts={Object.values(FIELDS).map((f) => ({ value: f.id, label: f.label.en, classes: [...f.classes] }))}
              boardOpts={BOARDS.map((b) => ({ value: b, label: b }))}
            />
          </div>
        </section>
      )}

      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Batch{enr && bt ? `: ${batchLabel(bt.cls, bt.field)}` : ""}</h2>
          {enr && (
            <p className="text-sm text-slate-600">
              Joined {when(enr.paidAt)}, ₹{enr.amount} {enr.mode === "demo" ? "(demo)" : enr.mode === "admin" ? (enr.amount === 0 ? "(free, given by admin)" : "(added by admin)") : "(paid)"}
            </p>
          )}
        </div>
        {!p ? (
          <p className="mt-2 text-sm text-slate-600">The student must fill the profile before joining a batch.</p>
        ) : (
          <div className="mt-3">
            {mine.length > 1 && (
              <ul className="mb-4 divide-y divide-slate-200 rounded-lg border border-slate-300 bg-white">
                {mine.map(({ e, b }) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>
                      <b>{batchLabel(b.cls, b.field)}</b> · joined {when(e.paidAt)}, {e.mode === "admin" && e.amount === 0 ? "free (given by admin)" : `₹${e.amount}`}
                    </span>
                    {e.id === enr?.id ? (
                      <span className="pill bg-brand-100 text-brand-800">Shown below</span>
                    ) : (
                      <SmallAction id={u.id} action="current" extra={{ enr: e.id }} label="Show this batch" confirmText="Show this batch here? It also becomes the batch open on the student's dashboard." />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!enr && <p className="mb-3 text-sm text-slate-600">Not in a batch. {batchOpts.map((o) => `${o.label}: ₹${o.price}`).join(" · ")}</p>}
            <BatchControls id={u.id} enrolled={Boolean(enr)} start={enr ? day(enr.paidAt) : undefined} options={batchOpts} addable={addable} current={enr ? bt?.field : undefined} />
          </div>
        )}

        {sm && chapters && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 md:grid-cols-5">
              {[
                ["Proxam score", `${sm.pct}%`],
                ["Chapters done", `${sm.covered}/${sm.totalChapters}`],
                ["Steps behind", String(sm.overdue)],
                ["Checkpoints taken", `${sm.checkpointsTaken}${sm.checkpointsDue ? ` (${sm.checkpointsDue} due)` : ""}`],
                ["Last active", sm.lastDone ? when(sm.lastDone) : "Never"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-slate-500">{k}</p>
                  <p className="font-display text-lg font-bold text-brand-900">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Exam: {sm.exam.name} on {sm.exam.dateLabel}, {sm.exam.daysLeft} days left.
            </p>

            <div className="mt-4 space-y-2">
              {(Object.keys(chapters) as SubjectKey[]).map((k) => {
                const list = chapters[k];
                const n = list.filter((c) => done[`${c.id}:learn`] && done[`${c.id}:practice`]).length;
                return (
                  <details key={k} className="rounded-lg border border-slate-200 p-3">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {SUBJECT_NAME[k].en} <span className="font-normal text-slate-500">({n}/{list.length} chapters done)</span>
                      </span>
                      <SubjectButtons id={u.id} subject={k} />
                    </summary>
                    <ul className="mt-2">
                      {list.map((c) => (
                        <ChapterRow key={c.id} id={u.id} chapterId={c.id} title={`${c.level !== p!.cls && p!.cls === "dropper" ? `Class ${c.level}: ` : ""}${c.title}`} learn={Boolean(done[`${c.id}:learn`])} practice={Boolean(done[`${c.id}:practice`])} hasVideo={Boolean(db.chapterContent?.[c.id]?.videos.length)} />
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
            <div className="mt-3">
              <SmallAction id={u.id} action="reset" label="Reset all progress" danger confirmText="Clear every chapter this student has marked done?" />
            </div>
          </>
        )}
      </section>

      {pv && p && enr && (
        <>
          <section className="card" id="plan">
            <h2 className="text-lg">Roadmap: this week and next</h2>
            <p className="mb-4 text-sm text-slate-600">
              Add topics, question sets, revision or a one to one meeting on any day. Move a chapter to another date, set the week&apos;s goal. The student sees every change on their dashboard.
            </p>
            <div className="mb-4 rounded-lg border border-slate-200 p-3">
              <WeekAccess target={{ userId: u.id }} isBatch={false} status={pv.releaseStatus} fromBatch={pv.releaseFromBatch} nextWeekLabel={nextWeekLabel()} />
            </div>
            <PlanWeeks target={{ userId: u.id }} isBatch={false} weeks={pv.weeks} initialWeek={pv.initialWeek} tasks={pv.tasks} subjects={subjectOpts(bt!.field)} today={dayKey(Date.now())} />
          </section>
          <section className="card">
            <h2 className="text-lg">Test syllabus</h2>
            <p className="mb-3 text-sm text-slate-600">Which chapters each checkpoint test covers, and its date. Change it for this student only; the batch syllabus is set on the batch roadmap page.</p>
            <TestSyllabus target={{ userId: u.id }} isBatch={false} tests={pv.tests} subjects={syllabusGroups(bt!.cls, bt!.field)} />
          </section>
          <section className="card">
            <h2 className="mb-4 text-lg">Roadmap settings</h2>
            <PlanSettings
              target={{ userId: u.id }}
              isBatch={false}
              start={day(enr.paidAt)}
              endDate={pv.endDate}
              defaultEndLabel={`3 weeks before ${pv.examLabel}`}
              order={pv.order}
              subjects={subjectOpts(bt!.field)}
              skipped={pv.skipped}
              chapterOpts={chapterOpts(bt!.cls, bt!.field, pv.allSkip)}
            />
          </section>
        </>
      )}

      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Tests</h2>
          <span className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {attemptsLeft(u, attempts)} left ({FREE_ATTEMPTS} free + {(u.testPurchases || []).length} extra)
            <SmallAction id={u.id} action="grantTest" label="Give 1 free test" />
          </span>
        </div>
        {attempts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No tests yet.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="py-2">{a.checkpointNo ? `Checkpoint ${a.checkpointNo}` : `Attempt ${a.attemptNo}${a.paid ? " (₹49)" : ""}`}</td>
                  <td className="py-2 text-slate-500">{when(a.startedAt)}</td>
                  <td className="py-2">{a.status === "submitted" ? <b>{Math.round(a.result!.percentage)}%</b> : "In progress"}</td>
                  <td className="py-2 text-xs text-slate-500">{a.result?.weak.join(", ")}</td>
                  <td className="py-2 text-right">
                    {a.status === "submitted" && (
                      <Link className="text-brand-700 underline" href={`/result/${a.id}`} target="_blank">
                        Result
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card">
          <h2 className="text-lg">Calls</h2>
          {calls.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No calls.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {calls.map((b) => (
                <li key={b.id}>
                  {when(b.slotStart)}, <span className="pill bg-slate-100">{b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="text-lg">Masterclass seats</h2>
          {seats.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">None.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {seats.map(({ s, m }) => (
                <li key={s.masterclassId} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {m ? `${m.title} (${mcAudience(m)})` : "Deleted masterclass"}, {when(m?.startsAt)}
                  </span>
                  <SmallAction id={u.id} action="removeSeat" extra={{ masterclassId: s.masterclassId }} label="Remove" danger confirmText="Remove this seat?" />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="text-lg">Doubts</h2>
          <p className="mt-2 text-sm text-slate-600">
            {doubts.length} asked, {doubts.filter((d) => d.status === "open").length} waiting for a reply.
          </p>
          {doubts.length > 0 && (
            <Link className="mt-2 inline-block text-sm font-semibold text-brand-700 underline" href={`/admin/doubts?show=all&student=${u.id}`}>
              Open doubts
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
