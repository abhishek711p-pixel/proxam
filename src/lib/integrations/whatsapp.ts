import "server-only";

// ------------------------------------------------------------------
// WhatsApp through Meta's WhatsApp Cloud API (no middleman).
// Business-started messages must use templates approved by Meta.
// Template names + texts to create are in README.md.
// Needs WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TOKEN.
// ------------------------------------------------------------------

export function whatsappEnabled() {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TOKEN);
}

export const WA_TEMPLATES = {
  booked: process.env.WHATSAPP_TEMPLATE_BOOKED || "proxam_booked",
  link: process.env.WHATSAPP_TEMPLATE_LINK || "proxam_link",
  reminder: process.env.WHATSAPP_TEMPLATE_REMINDER || "proxam_reminder",
  cancelled: process.env.WHATSAPP_TEMPLATE_CANCELLED || "proxam_cancelled",
  otp: process.env.WHATSAPP_TEMPLATE_OTP || "proxam_otp",
};

/** Sends an approved template. `params` fill {{1}}, {{2}} ... in order. Returns the WhatsApp message id. */
export async function sendWhatsAppTemplate(opts: { to: string; template: string; params: string[]; otpButton?: string }) {
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const components: Record<string, unknown>[] = [
    { type: "body", parameters: opts.params.map((text) => ({ type: "text", text })) },
  ];
  // Authentication (OTP) templates have a "copy code" button that also needs the code.
  if (opts.otpButton) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: opts.otpButton }] });
  }
  const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${opts.to}`,
      type: "template",
      template: { name: opts.template, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" }, components },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; error_data?: { details?: string } } };
  if (!res.ok || !data.messages?.[0]?.id) {
    throw new Error(data.error?.error_data?.details || data.error?.message || `HTTP ${res.status}`);
  }
  return data.messages[0].id;
}
