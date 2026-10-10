# Transactional email (Resend)

Production agent, 2026-10-10. Code: `packages/core/src/email.ts` (fetch to the Resend HTTP API, no SDK). Tests: `pnpm test:production`.

## What we send

| Email | Trigger | Template | Idempotency |
|---|---|---|---|
| Sign-in link | `POST /auth/magic` | `magicLinkEmail(url)`: one button, 20-minute expiry, "ignore if you didn't ask" | none (each request is a new link) |
| Welcome | first time an account is created, any method (`findOrCreateUser`) | `welcomeEmail(name)`: the three steps (paste site, test, switch on a channel), link to /dashboard, "a person reads every reply" | `welcome:<userId>` |
| You're on <Plan> | Stripe `customer.subscription.created` | `planStartedEmail(plan)`, link to /billing; Stripe sends the receipt itself | `stripe:<event id>` |
| Payment failed | Stripe `invoice.payment_failed` | `paymentFailedEmail()`: bots keep answering while Stripe retries; what happens if the last retry fails | `stripe:<event id>` |
| Subscription ended | Stripe `customer.subscription.deleted` | `planEndedEmail()`: data kept, Free limits, resubscribe link | `stripe:<event id>` |

All templates: plain text + simple HTML (inline styles, one button, no images, no tracking pixels), no em dashes, user values HTML-escaped.
The brand comes from `BRAND_NAME` (default Threadline; set `HeyBell` at the rename). Reply-To is `hello@<domain>`, which lands in
Aki's inbox via Cloudflare Email Routing (launch/domain/CUTOVER.md §4b-A).

Receipts and invoices: turn on in Stripe (Settings → Customer emails → "Successful payments" and "Finalized invoices"), not ours.

## Fallback when Resend is not configured or fails

- `RESEND_API_KEY` unset (local dev): nothing is sent; the magic link is printed in the server log and, only when `NODE_ENV` is not
  production or `THREADLINE_DEV_LINKS=1`, shown on the "check your email" page as a dev button.
- Resend configured but the send fails: the user sees "We couldn't send the email just now. Try again in a few minutes, or sign in
  with a password", the error goes to Sentry. The link is **never** shown on screen in that case (anyone could sign in as anyone).
- Welcome and billing emails are fire-and-forget: a failure never blocks signup or the Stripe webhook.

## Environment

| Var | Value in production |
|---|---|
| `RESEND_API_KEY` | Worker secret (from Keychain "Threadline Ops", via deploy.sh) |
| `EMAIL_FROM` | `HeyBell <login@heybell.app>` (default derives `<BRAND_NAME> <login@<MAIL_DOMAIN or APP_URL host>>`) |
| `EMAIL_REPLY_TO` | default `hello@heybell.app` |
| `BRAND_NAME` | `HeyBell` after the rename |

## DNS: SPF, DKIM, DMARC (heybell.app zone, Cloudflare)

Sending happens on the `send.` subdomain, so Resend's SPF never collides with the apex SPF used by Email Routing or Google Workspace.
Step-by-step clicks are in launch/domain/CUTOVER.md §4; the records, for review:

| Type | Name | Value | Purpose |
|---|---|---|---|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` priority 10 (copy exact value from Resend) | bounce handling for the Return-Path domain |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` (copy from Resend) | **SPF** for the envelope sender `send.heybell.app` |
| TXT | `resend._domainkey` | `p=MIGf...` (the key Resend shows) | **DKIM**, signs as `heybell.app` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@heybell.app; adkim=r; aspf=r; pct=100` | **DMARC**, monitor first |

DMARC plan: start at `p=none` for 2 weeks and read the aggregate reports at dmarc@ (routed to Aki). When every legitimate source passes
(Resend, plus Google Workspace if added), move to `p=quarantine`, then `p=reject` after another 2 weeks. Alignment passes through DKIM
(`d=heybell.app`); SPF alignment is relaxed because the envelope domain is `send.heybell.app`.
`getheybell.com` never sends mail: `v=spf1 -all` and `p=reject` (domain CUTOVER §2c).

Verify after DNS propagates:
```bash
dig +short TXT send.heybell.app            # v=spf1 include:amazonses.com ~all
dig +short TXT resend._domainkey.heybell.app
dig +short TXT _dmarc.heybell.app
```
Then send yourself a sign-in link and check Gmail "Show original": `SPF: PASS`, `DKIM: PASS with domain heybell.app`, `DMARC: PASS`.

Deliverability notes: transactional mail only from this domain (gtm's cold email uses lookalike domains, never heybell.app); keep the
sign-in subject stable; no link shorteners. Resend docs: https://resend.com/docs/knowledge-base/cloudflare
