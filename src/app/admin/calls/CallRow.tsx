"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking } from "@/lib/types";
import Select from "@/components/Select";

type Student = { name: string; mobile: string; field: string; cls: string; goal: string; score: string; weak: string[]; interest: string; reco: string };
const OUTCOMES = ["", "Interested in batch", "Paid", "Needs parent follow-up", "Not interested", "Call back later"];

export default function CallRow({ booking, student, googleOn, waMessage }: { booking: Booking; student: Student; googleOn: boolean; waMessage: string }) {
  const router = useRouter();
  const [link, setLink] = useState(booking.meetingLink || "");
  const [notes, setNotes] = useState(booking.notes || "");
  const [outcome, setOutcome] = useState(booking.outcome || "");
  const [status, setStatus] = useState(booking.status);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setCreating(true);
    setMsg("");
    const r = await fetch(`/api/admin/bookings/${booking.id}/link`, {
      method: "POST",
      body: JSON.stringify({ switchToMeet: booking.platform !== "meet" }),
    }).then((r) => r.json());
    setCreating(false);
    if (!r.ok) return setMsg(r.error);
    setLink(r.link);
    router.refresh();
  }
  const wa = waMessage ? `https://wa.me/91${student.mobile}?text=${encodeURIComponent(waMessage)}` : "";
  const when = new Date(booking.slotStart).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  async function save() {
    setMsg("Saving…");
    const r = await fetch(`/api/admin/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ meetingLink: link, notes, outcome, status }) }).then((r) => r.json());
    setMsg(r.ok ? "Saved ✓" : r.error);
    if (r.ok) router.refresh();
  }

  return (
    <div className="card p-4">
      <button className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpen(!open)}>
        <span>
          <b>{student.name}</b> <span className="text-sm text-slate-500">· {student.mobile} · {student.cls === "dropper" ? "Dropper" : `Class ${student.cls}`} {student.field}</span>
        </span>
        <span className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{when}</span>
          <span className="pill bg-slate-100">{booking.platform === "meet" ? "Meet" : "Zoom"}</span>
          {booking.status === "booked" && !booking.meetingLink && <span className="pill bg-accent-100 text-accent-800">No link</span>}
          <span className={`pill ${status === "attended" ? "bg-brand-100 text-brand-700" : status === "no_show" ? "bg-rose-100 text-rose-700" : status === "cancelled" ? "bg-slate-200" : "bg-accent-100 text-accent-800"}`}>{status}</span>
          <span className="text-slate-400">{open ? "▲" : "▼"}</span>
        </span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm">
            {booking.syncError && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">Google/Zoom error: {booking.syncError}</p>}
            {booking.calendarEventId && <p className="text-xs text-brand-700">✓ On Google Calendar{booking.linkSource && booking.linkSource !== "manual" ? ` · link created by ${booking.linkSource === "google" ? "Google Meet" : "Zoom"}` : ""}</p>}
            <p><b>Goal:</b> {student.goal}</p>
            <p><b>Latest score:</b> {student.score}</p>
            {student.reco && <p><b>Suggested stream:</b> {student.reco}</p>}
            {student.interest && <p><b>Top interest:</b> {student.interest}</p>}
            <p><b>Weak topics:</b> {student.weak.length ? student.weak.join("; ") : "—"}</p>
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Agenda (20 to 30 min): review result, understand goals, explain gaps, show an achievable target and timeline, introduce the batch (₹299 to ₹999 by class, one-time). Never promise admission.</p>
          </div>
          <div className="space-y-3">
            {status === "booked" && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold">Share the link</p>
                {booking.meetingLink ? (
                  <>
                    <a href={booking.meetingLink} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-brand-700 underline">
                      {booking.meetingLink}
                    </a>
                    <p className="mt-1 text-xs text-slate-500">
                      You: it is on your Google Calendar{booking.calendarEventId ? "" : " (not yet)"}. Student: it shows on their dashboard{" "}
                      and goes to their WhatsApp/SMS automatically once those are connected.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a href={wa} target="_blank" rel="noreferrer" className="btn btn-sm bg-[#25D366] text-white hover:bg-[#1ebe5b]">
                        Send on WhatsApp
                      </a>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={async () => {
                          await navigator.clipboard?.writeText(waMessage);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }}
                      >
                        {copied ? "Copied ✓" : "Copy message"}
                      </button>
                    </div>
                  </>
                ) : googleOn ? (
                  <>
                    <p className="mt-1 text-xs text-slate-500">
                      {booking.platform === "zoom"
                        ? "Zoom is not connected, so no link was made. Create a Google Meet link instead (adds it to your calendar, shows on the student's dashboard)."
                        : "No link yet (booked before Google was connected, or the first try failed)."}
                    </p>
                    <button type="button" className="btn-primary btn-sm mt-2" onClick={createLink} disabled={creating}>
                      {creating ? "Creating…" : booking.platform === "zoom" ? "Create Google Meet link instead" : "Create Google Meet link"}
                    </button>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Connect Google in Admin &gt; Calendar to create Meet links automatically, or paste a link below.</p>
                )}
              </div>
            )}
            <div>
              <label className="label">Meeting link {link !== (booking.meetingLink || "") && link ? <span className="font-normal text-slate-500">(student gets an SMS when you save)</span> : null}</label>
              <input className="input" placeholder="https://meet.google.com/..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Status</label>
                <Select ariaLabel="Status" value={status} onChange={(v) => setStatus(v as Booking["status"])} options={["booked", "attended", "no_show", "cancelled"].map((s) => ({ value: s, label: s }))} />
              </div>
              <div>
                <label className="label">Outcome</label>
                <Select ariaLabel="Outcome" value={outcome} onChange={setOutcome} options={OUTCOMES.map((o) => ({ value: o, label: o || "—" }))} />
              </div>
            </div>
            <div>
              <label className="label">Counsellor notes</label>
              <textarea className="input min-h-28 py-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Level, gaps, achievable target, colleges (as ranges)…" />
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary btn-sm" onClick={save}>Save</button>
              <span className="text-sm text-slate-600">{msg}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
