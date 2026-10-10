// Transactional email through Resend's HTTP API (owned by agent production). No SDK; fetch only.
//   RESEND_API_KEY   unset → nothing is sent and send() returns { sent: false } (callers fall back to dev links / logs)
//   EMAIL_FROM       default "<BRAND_NAME> <login@<MAIL_DOMAIN>>"; MAIL_DOMAIN defaults to the APP_URL host
//   EMAIL_REPLY_TO   default hello@<MAIL_DOMAIN>
//   BRAND_NAME       default Threadline (set HeyBell at the rename)
//   RESEND_API_BASE  test hook (default https://api.resend.com)
// Templates are plain, short, no tracking pixels, no em dashes. Each returns subject + text + html.

export const brand = () => process.env.BRAND_NAME || "Threadline";
export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export function mailDomain(): string {
  if (process.env.MAIL_DOMAIN) return process.env.MAIL_DOMAIN;
  try { return new URL(appUrl()).hostname.replace(/^www\./, ""); } catch { return "localhost"; }
}
export const fromAddress = () => process.env.EMAIL_FROM || `${brand()} <login@${mailDomain()}>`;
export const replyTo = () => process.env.EMAIL_REPLY_TO || `hello@${mailDomain()}`;
export const emailConfigured = () => !!process.env.RESEND_API_KEY;

export interface Email { subject: string; text: string; html: string }
export interface SendResult { sent: boolean; id?: string; error?: string }

export async function send(to: string, mail: Email, opts: { idempotencyKey?: string; tag?: string } = {}): Promise<SendResult> {
  if (!emailConfigured()) return { sent: false, error: "not_configured" };
  const base = (process.env.RESEND_API_BASE || "https://api.resend.com").replace(/\/$/, "");
  const headers: Record<string, string> = { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey.slice(0, 256);
  try {
    const r = await fetch(`${base}/emails`, {
      method: "POST", headers, signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: fromAddress(), to: [to], reply_to: replyTo(), subject: mail.subject, text: mail.text, html: mail.html,
        tags: opts.tag ? [{ name: "type", value: opts.tag }] : undefined,
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { sent: false, error: `HTTP ${r.status} ${(body as any)?.message ?? ""}`.trim() };
    return { sent: true, id: (body as any)?.id };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}

// ---------- templates ----------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, paras: string[], cta?: { label: string; url: string }, foot?: string): string {
  const p = paras.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1a1a1a">${t}</p>`).join("");
  const button = cta
    ? `<p style="margin:22px 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${esc(cta.label)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;color:#666">Or paste this link into your browser:<br><span style="word-break:break-all">${esc(cta.url)}</span></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<tr><td>
<p style="margin:0 0 24px;font-weight:700;font-size:17px;color:#0a0a0a">${esc(brand())}</p>
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:#0a0a0a">${esc(title)}</h1>
${p}${button}
<p style="margin:26px 0 0;font-size:12px;line-height:1.5;color:#888">${foot ?? `You got this email because of your ${esc(brand())} account. Questions? Reply to this email.`}</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function magicLinkEmail(url: string): Email {
  const b = brand();
  return {
    subject: `Your ${b} sign-in link`,
    text: `Tap to sign in to ${b}:\n\n${url}\n\nThe link works once and expires in 20 minutes. If you didn't ask for it, ignore this email.`,
    html: layout(`Sign in to ${b}`, ["Tap the button to sign in. The link works once and expires in 20 minutes."], { label: "Sign in", url },
      "If you didn't ask for this link, ignore this email. Nobody can sign in without it."),
  };
}

export function welcomeEmail(name?: string | null): Email {
  const b = brand(), url = `${appUrl()}/dashboard`;
  const hi = name ? `Hi ${name.split(" ")[0]},` : "Hi,";
  return {
    subject: `Welcome to ${b}`,
    text: `${hi}\n\nYour ${b} account is ready. Three steps to your first texting agent:\n\n1. Paste your website (or describe your business). We read it and build the bot.\n2. Ask it the questions your customers ask. Fix anything it gets wrong.\n3. Turn on Telegram or iMessage and text it from your phone.\n\nStart here: ${url}\n\nReply to this email if anything gets in your way. A person reads every reply.`,
    html: layout("Your account is ready", [
      esc(hi), "Three steps to your first texting agent:",
      "1. Paste your website (or describe your business). We read it and build the bot.<br>2. Ask it the questions your customers ask. Fix anything it gets wrong.<br>3. Turn on Telegram or iMessage and text it from your phone.",
      "Reply to this email if anything gets in your way. A person reads every reply.",
    ], { label: "Build my bot", url }),
  };
}

export function planStartedEmail(planName: string): Email {
  const b = brand(), url = `${appUrl()}/billing`;
  return {
    subject: `You're on ${b} ${planName}`,
    text: `Thanks for subscribing. Your ${planName} plan is active now and your new limits apply right away.\n\nInvoices, card and plan changes: ${url}\n\nStripe emails your receipt separately.`,
    html: layout(`You're on ${planName}`, ["Thanks for subscribing. Your plan is active now and your new limits apply right away.", "Stripe emails your receipt separately."],
      { label: "Open billing", url }),
  };
}

export function paymentFailedEmail(): Email {
  const b = brand(), url = `${appUrl()}/billing`;
  return {
    subject: `Action needed: your ${b} payment didn't go through`,
    text: `We couldn't charge your card for ${b}. Your bots keep answering for now while Stripe retries over the next few days.\n\nUpdate your card here: ${url}\n\nIf the last retry fails, your account moves to the Free plan and customer iMessage stops.`,
    html: layout("Your payment didn't go through", [
      "We couldn't charge your card. Your bots keep answering for now while Stripe retries over the next few days.",
      "If the last retry fails, your account moves to the Free plan and customer iMessage stops.",
    ], { label: "Update card", url }),
  };
}

export function planEndedEmail(): Email {
  const b = brand(), url = `${appUrl()}/billing`;
  return {
    subject: `Your ${b} subscription has ended`,
    text: `Your paid plan has ended and your account is on Free now. Your bots, knowledge and conversations are all still here.\n\nFree includes 50 conversations a month on Telegram. Resubscribe any time: ${url}`,
    html: layout("Your subscription has ended", [
      "Your account is on the Free plan now. Your bots, knowledge and conversations are all still here.",
      "Free includes 50 conversations a month on Telegram. You can resubscribe any time.",
    ], { label: "See plans", url }),
  };
}

/** Billing email for a Stripe event that billing.handleStripeEvent just applied, or null. userEmail/planName resolved by caller. */
export function billingEmailFor(eventType: string, planName: string | null): { mail: Email; tag: string } | null {
  if (eventType === "customer.subscription.created" && planName) return { mail: planStartedEmail(planName), tag: "plan_started" };
  if (eventType === "invoice.payment_failed") return { mail: paymentFailedEmail(), tag: "payment_failed" };
  if (eventType === "customer.subscription.deleted") return { mail: planEndedEmail(), tag: "plan_ended" };
  return null;
}
