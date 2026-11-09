import { callList } from "@/lib/adminData";
import Pager from "@/components/admin/Pager";
import { FIELDS, INTERESTS } from "@/lib/config";
import CallRow from "./CallRow";
import { linkMessage } from "@/lib/bookingHooks";
import { googleMode } from "@/lib/integrations/google";

export default async function Calls({ searchParams }: { searchParams: Promise<{ show?: string; page?: string }> }) {
  const { show = "upcoming", page: pg } = await searchParams;
  const page = Math.max(1, Number(pg) || 1);
  const googleOn = Boolean(await googleMode());
  const { rows: list, hasNext } = await callList(show, 30, (page - 1) * 30);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Guidance calls</h1>
        <div className="flex gap-1">
          {["upcoming", "past", "all"].map((s) => (
            <a key={s} href={`/admin/calls?show=${s}`} className={`btn-sm btn ${show === s ? "bg-brand-600 text-white" : "border border-slate-300 bg-white"}`}>{s}</a>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-600">Paste the Google Meet or Zoom link for each call. It shows on the student&apos;s dashboard. Notes feed the Gap and Goal report (Phase 2).</p>
      {list.length === 0 ? (
        <p className="card text-slate-500">No calls here.</p>
      ) : (
        <div className="space-y-3">
          {list.map(({ data: b, mobile, profile, attempt: a }) => {
            const u = { mobile, profile: profile || undefined };
            return (
              <CallRow
                key={b.id}
                booking={b}
                googleOn={googleOn}
                waMessage={b.meetingLink ? linkMessage(b, u?.profile?.name) : ""}
                student={{
                  name: u?.profile?.name || "—",
                  mobile: u?.mobile || "",
                  field: u?.profile ? FIELDS[u.profile.field].label.en : "",
                  cls: u?.profile?.cls || "",
                  goal: u?.profile?.targetGoal || "",
                  score: a?.result ? `${a.result.percentage}% · ${a.result.level}` : "—",
                  weak: a?.result?.weakTopics || [],
                  interest: a?.result?.topInterest ? INTERESTS[a.result.topInterest].en : "",
                  reco: a?.result?.streamRecommendation || "",
                }}
              />
            );
          })}
        </div>
      )}
      <Pager base="/admin/calls" params={{ show }} page={page} hasNext={hasNext} />
    </div>
  );
}
