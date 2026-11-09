import "server-only";
import { newId, nowISO } from "../ids";
import { addMessage } from "../store";
import type { MessageKind } from "../types";

// ------------------------------------------------------------------
// SMS through MSG91 (India). In India every SMS must use a DLT-approved
// template, so we send the template id + variables, not free text.
// The template texts to register are in README.md.
//
// No SMS_PROVIDER set = dev mode: nothing is sent, the message is only
// logged (Admin > SMS log) so you can see exactly what would go out.
// ------------------------------------------------------------------

const TEMPLATE_ENV: Record<MessageKind, string> = {
  otp: "MSG91_TEMPLATE_OTP",
  booked: "MSG91_TEMPLATE_BOOKED",
  link: "MSG91_TEMPLATE_LINK",
  reminder: "MSG91_TEMPLATE_REMINDER",
  cancelled: "MSG91_TEMPLATE_CANCELLED",
};

export function smsProvider() {
  return process.env.SMS_PROVIDER === "msg91" && process.env.MSG91_AUTH_KEY ? "msg91" : null;
}

/**
 * Sends one SMS and logs it. Never throws: a failed SMS must not break a booking.
 * `vars` are filled into the DLT template as var1, var2, var3 ... in order.
 */
export async function sendSms(opts: { to: string; kind: MessageKind; text: string; vars: string[]; bookingId?: string }) {
  const provider = smsProvider();
  let status: "sent" | "failed" | "dev" = "dev";
  let error: string | undefined;

  if (provider === "msg91") {
    const templateId = process.env[TEMPLATE_ENV[opts.kind]];
    if (!templateId) {
      status = "failed";
      error = `${TEMPLATE_ENV[opts.kind]} is not set`;
    } else {
      try {
        const recipient: Record<string, string> = { mobiles: `91${opts.to}` };
        opts.vars.forEach((v, i) => (recipient[`var${i + 1}`] = v));
        const res = await fetch("https://control.msg91.com/api/v5/flow", {
          method: "POST",
          headers: { authkey: process.env.MSG91_AUTH_KEY!, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ template_id: templateId, short_url: "0", recipients: [recipient] }),
          signal: AbortSignal.timeout(10_000),
        });
        const data = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
        if (!res.ok || data.type === "error") {
          status = "failed";
          error = data.message || `HTTP ${res.status}`;
        } else status = "sent";
      } catch (e) {
        status = "failed";
        error = e instanceof Error ? e.message : String(e);
      }
    }
  } else if (opts.kind !== "otp") {
    console.log(`[sms:dev] to ${opts.to}: ${opts.text}`);
  }

  await logMessage({ channel: "sms", to: opts.to, kind: opts.kind, text: opts.text, status, provider: provider || undefined, error, bookingId: opts.bookingId });
  return { status, error };
}

/** Adds one line to Admin > Messages. OTP codes are never stored. */
export async function logMessage(m: {
  channel: "sms" | "whatsapp" | "email";
  to: string;
  kind: MessageKind;
  text: string;
  status: "sent" | "failed" | "dev";
  provider?: string;
  error?: string;
  bookingId?: string;
}) {
  await addMessage({ id: newId("m_"), at: nowISO(), ...m, text: m.kind === "otp" ? "Login OTP (code hidden)" : m.text });
}
