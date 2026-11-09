import { emailEnabled } from "@/lib/integrations/email";
import { recentMessages } from "@/lib/store";
import { integrationStatus } from "@/lib/bookingHooks";

const KIND: Record<string, string> = {
  otp: "Login OTP",
  booked: "Booking confirmed",
  link: "Meeting link",
  reminder: "Reminder",
  cancelled: "Cancelled",
};
const STATUS: Record<string, string> = {
  sent: "bg-brand-100 text-brand-700",
  failed: "bg-rose-100 text-rose-700",
  dev: "bg-accent-100 text-accent-800",
};

export default async function Messages() {
  const list = await recentMessages(300);
  const st = await integrationStatus();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-slate-600">
          Every email, WhatsApp and SMS to students. Login email: <b>{emailEnabled() ? "connected" : "not connected (dev mode)"}</b> · WhatsApp: <b>{st.whatsapp ? "connected" : "not connected"}</b> · SMS: <b>{st.sms ? "connected" : "not connected"}</b>.
          {" "}&ldquo;not sent (dev)&rdquo; means that channel is not connected yet, so the message was only recorded here.
        </p>
      </div>
      {list.length === 0 ? (
        <p className="card text-slate-500">No messages yet. Book a call to see the confirmation here.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((m) => (
            <li key={m.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">+91 {m.to}</span>
                <span className={`pill ${m.channel === "whatsapp" ? "bg-[#dcf8c6] text-[#075e54]" : "bg-slate-100 text-slate-700"}`}>
                  {m.channel === "whatsapp" ? "WhatsApp" : m.channel === "email" ? "Email" : "SMS"}
                </span>
                <span className="pill bg-slate-100 text-slate-700">{KIND[m.kind]}</span>
                <span className={`pill ${STATUS[m.status]}`}>{m.status === "dev" ? "not sent (dev)" : m.status}</span>
                <span className="ml-auto text-xs text-slate-500">
                  {new Date(m.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{m.text}</p>
              {m.error && <p className="mt-1 text-xs text-rose-700">Error: {m.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
