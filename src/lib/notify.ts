import "server-only";
import { logMessage, sendSms } from "./integrations/sms";
import { WA_TEMPLATES, sendWhatsAppTemplate, whatsappEnabled } from "./integrations/whatsapp";
import type { MessageKind } from "./types";

/**
 * Tells the student something on every connected channel:
 * WhatsApp (if connected) + SMS (if connected). Never throws.
 * Not connected = only logged (Admin > Messages, status "dev").
 */
export async function notifyStudent(opts: {
  to: string;
  kind: Exclude<MessageKind, "otp">;
  text: string; // human-readable version for the log
  sms: string[]; // DLT template variables
  wa: string[]; // WhatsApp template variables {{1}}, {{2}} ...
  bookingId?: string;
}) {
  if (whatsappEnabled()) {
    try {
      await sendWhatsAppTemplate({ to: opts.to, template: WA_TEMPLATES[opts.kind], params: opts.wa });
      await logMessage({ channel: "whatsapp", to: opts.to, kind: opts.kind, text: opts.text, status: "sent", provider: "meta", bookingId: opts.bookingId });
    } catch (e) {
      await logMessage({
        channel: "whatsapp",
        to: opts.to,
        kind: opts.kind,
        text: opts.text,
        status: "failed",
        provider: "meta",
        error: e instanceof Error ? e.message : String(e),
        bookingId: opts.bookingId,
      });
    }
  } else {
    await logMessage({ channel: "whatsapp", to: opts.to, kind: opts.kind, text: opts.text, status: "dev", bookingId: opts.bookingId });
  }
  await sendSms({ to: opts.to, kind: opts.kind, text: opts.text, vars: opts.sms, bookingId: opts.bookingId });
}
