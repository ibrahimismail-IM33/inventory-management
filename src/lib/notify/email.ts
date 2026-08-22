// Email channel (Resend). The alert engine is channel-agnostic: it builds a
// digest, then dispatches to enabled channels. Add notify/telegram.ts,
// notify/whatsapp.ts later with the same shape.

export interface SendResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "WAQT <onboarding@resend.dev>";
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };
  if (opts.to.length === 0) return { ok: false, error: "no recipients" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
  }
  return { ok: true };
}
