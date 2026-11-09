import "server-only";
import { BRAND } from "../config";
import { logMessage } from "./sms";

// Email sending for login OTPs. Three providers, tried in order until one works:
//   ZeptoMail (ZEPTOMAIL_TOKEN), Brevo (BREVO_API_KEY), Resend (RESEND_API_KEY).
// Only providers with a key are used. Change the order with EMAIL_PROVIDERS=brevo,resend,zeptomail.
// So when ZeptoMail's free credit runs out, add a Brevo key and mail keeps going: no code change.

type Provider = "zeptomail" | "brevo" | "resend";
type Mail = { to: string; subject: string; html: string; text: string };

const KEY: Record<Provider, string> = { zeptomail: "ZEPTOMAIL_TOKEN", brevo: "BREVO_API_KEY", resend: "RESEND_API_KEY" };

function providers(): Provider[] {
  const order = (process.env.EMAIL_PROVIDERS || "zeptomail,brevo,resend").split(",").map((s) => s.trim()) as Provider[];
  return order.filter((p) => p in KEY && Boolean(process.env[KEY[p]]));
}

export function emailEnabled() {
  return providers().length > 0;
}

function from() {
  return { address: process.env.MAIL_FROM || "otp@proxam.in", name: process.env.MAIL_FROM_NAME || BRAND };
}

async function post(url: string, headers: Record<string, string>, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text().catch(() => "")).slice(0, 200)}`);
}

async function sendWith(p: Provider, m: Mail) {
  const f = from();
  if (p === "zeptomail") {
    // Copy the API URL shown in ZeptoMail > Mail Agents > SMTP/API (it differs by data centre: .com, .in, .eu)
    const url = process.env.ZEPTOMAIL_URL || "https://api.zeptomail.in/v1.1/email";
    const token = process.env.ZEPTOMAIL_TOKEN!.replace(/^Zoho-enczapikey\s+/i, "");
    return post(url, { authorization: `Zoho-enczapikey ${token}` }, {
      from: f,
      to: [{ email_address: { address: m.to } }],
      subject: m.subject,
      htmlbody: m.html,
      textbody: m.text,
    });
  }
  if (p === "brevo")
    return post("https://api.brevo.com/v3/smtp/email", { "api-key": process.env.BREVO_API_KEY! }, {
      sender: { email: f.address, name: f.name },
      to: [{ email: m.to }],
      subject: m.subject,
      htmlContent: m.html,
      textContent: m.text,
    });
  return post("https://api.resend.com/emails", { authorization: `Bearer ${process.env.RESEND_API_KEY}` }, {
    from: `${f.name} <${f.address}>`,
    to: [m.to],
    subject: m.subject,
    html: m.html,
    text: m.text,
  });
}

/** Sends through the first provider that works. Never throws. */
export async function sendEmail(m: Mail, kind: "otp" = "otp") {
  const errors: string[] = [];
  for (const p of providers()) {
    try {
      await sendWith(p, m);
      await logMessage({ channel: "email", to: m.to, kind, text: m.subject, status: "sent", provider: p }).catch(() => {});
      return { ok: true as const, provider: p };
    } catch (e) {
      errors.push(`${p}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  await logMessage({ channel: "email", to: m.to, kind, text: m.subject, status: "failed", error: errors.join(" | ").slice(0, 500) }).catch(() => {});
  return { ok: false as const };
}

/** The OTP email: short, plain, no links or images (that keeps it out of spam). */
export function otpEmail(code: string) {
  const subject = `${code} is your ${BRAND} login code`;
  const text = `Your ${BRAND} login code is ${code}.\nIt works for 5 minutes. Do not share it with anyone.\n\nतुम्हारा ${BRAND} लॉग इन कोड ${code} है। यह 5 मिनट तक चलेगा।\n\nIf you did not ask for this code, you can ignore this email.`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;line-height:1.5">
<p>Your ${BRAND} login code is</p>
<p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:8px 0">${code}</p>
<p>It works for 5 minutes. Do not share it with anyone.</p>
<p>तुम्हारा ${BRAND} लॉग इन कोड ${code} है। यह 5 मिनट तक चलेगा।</p>
<p style="color:#777;font-size:13px">If you did not ask for this code, you can ignore this email.</p>
</div>`;
  return { subject, text, html };
}
