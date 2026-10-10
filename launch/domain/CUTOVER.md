# Domain cutover runbook (domain agent, 2026-10-10)

Chosen domain: **heybell.app** (primary). **getheybell.com** redirects to it. See REPORT.md.
If Aki keeps the Threadline name, replace `heybell.app` with `threadline.chat` everywhere below and skip the getheybell.com steps.

Every step that buys something, accepts terms or changes DNS is **Aki only**. Agents prepare the config diffs locally and never deploy.
The production agent owns `deploy/**`. The diffs below are for them to apply.

Current state:
- One Cloudflare Worker `threadline` (deploy/cloudflare/wrangler.jsonc) fronts the container.
- `APP_URL` is `https://threadline.akshitbansal1313.workers.dev`.
- Email: magic links go through Resend when `RESEND_API_KEY` is set. `EMAIL_FROM` defaults to `Threadline <login@threadline.app>`, and **that domain is not ours**.

---

## 0. Before buying (5 min)

1. In the Cloudflare dash, use the **same account that owns the `threadline` Worker**. Custom Domains only attach to zones in the Worker's own account.
2. The account email must be verified. Registrar refuses otherwise, and an unverified registrant email puts the domain on hold.
3. Decide the registrant contact: Aki personally for now, or the company once legal forms it (launch/legal). Moving the domain to the entity later is just a contact update.

## 1. Buy on Cloudflare Registrar (Aki)

Dash → **Domain Registration → Register Domains** (https://dash.cloudflare.com/?to=/:account/domains/register).

1. Search `heybell.app`, then **Purchase**.
   - Expect **$8.20** for the first year, $14.20/yr renewal. If checkout shows anything higher, it is registry-premium: stop and tell the domain agent.
   - Term: 1 year. Auto-renew stays **on** (default).
   - Fill the registrant contact (ASCII only). WHOIS privacy is automatic where the registry allows it.
   - Payment, then accept the Domain Registration Agreement, then **Complete purchase**.
2. Repeat for `getheybell.com`. Expect **$10.46**/yr.
3. Optional, defensive: `heybell.chat` ($35.20/yr). Skip `heybell.ai` for now ($160 up front, 2-year minimum).
4. Each purchase creates a Cloudflare zone automatically. Cloudflare Registrar always uses Cloudflare nameservers, so there is nothing to change at another provider.
5. Click the ICANN verification email sent to the registrant address **within 15 days**.

Check (anyone can run it):

```bash
dig +short NS heybell.app          # two *.ns.cloudflare.com names
curl -s https://pubapi.registry.google/rdap/domain/heybell.app | grep -o '"registrar[^}]*Cloudflare'
```

## 2. Point the domain at the Worker (production agent prepares, Aki deploys)

### 2a. Custom Domain on the apex

`deploy/cloudflare/wrangler.jsonc`: add `routes` and switch `APP_URL`.

```jsonc
  "vars": { "APP_URL": "https://heybell.app" },
  "routes": [
    { "pattern": "heybell.app", "custom_domain": true }
  ],
```

- `custom_domain: true` makes Cloudflare create the DNS record and issue the certificate on deploy.
- The hostname must **not** already have a CNAME record. A fresh zone has none.
- Keep `workers_dev` enabled, so the old URL keeps answering during the switch.
- Do not change the container instance name (`main-v2`). It is unrelated to routing.
- Docs: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/

Deploy with the usual `deploy/cloudflare/deploy.sh` (Aki).

`deploy.sh` currently writes the workers.dev URL into `data/cloudflare_url.txt`. Production should change that line to echo `https://heybell.app` instead.

### 2b. www → apex redirect

Custom Domains match one exact hostname, so `www` needs its own record plus a rule. In the **heybell.app** zone:

1. DNS → Add record: type `AAAA`, name `www`, IPv6 `100::`, **Proxied** (orange cloud). This is a placeholder origin; Cloudflare answers before it reaches it.
2. Rules → **Redirect Rules** → Create:
   - When: Hostname equals `www.heybell.app`.
   - Then: Dynamic redirect, expression `concat("https://heybell.app", http.request.uri.path)`.
   - Status **301**. Preserve query string: on.

### 2c. getheybell.com → heybell.app

In the **getheybell.com** zone:

1. DNS: `AAAA @ 100::` (Proxied) and `AAAA www 100::` (Proxied).
2. Redirect Rule:
   - When: Hostname is in {`getheybell.com`, `www.getheybell.com`}.
   - Then: dynamic `concat("https://heybell.app", http.request.uri.path)`, **301**, preserve query string.
3. Lock its email down so nobody can spoof it (it never sends mail):
   - `MX @ .` priority 0 (null MX, RFC 7505). If the dashboard refuses `.`, skip the MX record and rely on SPF/DMARC.
   - `TXT @ "v=spf1 -all"`
   - `TXT _dmarc "v=DMARC1; p=reject; adkim=s; aspf=s"`

### 2d. Old workers.dev URL (optional, after a week)

Once traffic is on the new domain, production can add a check at the top of the Worker's fetch handler (deploy/cloudflare/src/index.ts): if `url.hostname.endsWith("workers.dev")`, return a 301 to `https://heybell.app` + path + query.

Exception: keep any machine endpoints (`/api/v1`, Stripe webhooks) answering on the old host until their callers are switched.

## 3. App configuration that depends on the domain

| What | Where | Change |
|---|---|---|
| `APP_URL` | wrangler.jsonc `vars` (above) | `https://heybell.app`. Drives metadataBase, magic links, auth redirects, `lib/auth.ts appUrl()` and the Google OAuth `redirect_uri` |
| Google OAuth | Google Cloud Console → Credentials → OAuth client | Add Authorized redirect URI `https://heybell.app/auth/google/callback` and JS origin `https://heybell.app`. Keep the workers.dev ones until the cutover is verified (Aki) |
| Stripe webhooks (billing agent, test mode) | Stripe Dashboard → Developers → Webhooks | Add endpoint `https://heybell.app/<billing webhook path>`, copy the new signing secret into the Worker secret (Aki). Also update Checkout/Portal return URLs if they are absolute |
| `EMAIL_FROM` | Worker secret or var | `HeyBell <login@heybell.app>` (after Resend verifies, section 4) |
| Contact address | `apps/web/components/site/data.ts` `CONTACT_EMAIL`, plus `mailto:hello@threadline.app` in billing/page.tsx, Wizard.tsx, ChannelCards.tsx, and the lib/auth.ts default sender | `hello@heybell.app`. **Do this even before the rename: threadline.app belongs to another company and receives this mail today** |
| Sessions | none | Cookies are host-scoped, so users logged in on workers.dev sign in once more on heybell.app. Expected |
| Telegram / Photon | none | Telegram long-polls and Photon uses the SDK stream. Neither has a webhook URL to change |

## 4. Email DNS (in the heybell.app zone)

Two jobs, kept separate so one can never break the other:

- **Sending** (magic links, receipts) goes through **Resend** on the `send.` subdomain.
- **Receiving** (`hello@`, `support@`, `dmarc@`):
  - **Option A, day one: Cloudflare Email Routing**, free. Forwards to Aki's inbox.
  - **Option B: Google Workspace.** $7/user/mo for Business Starter on an annual plan (estimate from https://workspace.google.com/pricing; check before buying). Use it when you need to *reply as* hello@heybell.app.

Pick **one** for the apex MX records.

### 4a. Resend (sending)

1. Resend → Domains → **Add Domain** `heybell.app`, region us-east-1.
2. Easiest path: **"Sign in to Cloudflare"**. Resend writes the records via Domain Connect.
3. Manual path: create exactly what Resend shows. Their pattern is:

| Type | Name | Value | Priority | Proxy |
|---|---|---|---|---|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (copy from Resend) | 10 | DNS only |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` (copy from Resend) | | |
| TXT | `resend._domainkey` | `p=MIGf...` (the DKIM key Resend shows) | | DNS only |

Notes:
- In Cloudflare, type only the subdomain part (`send`, not `send.heybell.app`).
- If Cloudflare shows error 1004, set the record to DNS only.
- Verification usually takes minutes; it can take up to 72 h.
- Docs: https://resend.com/docs/knowledge-base/cloudflare

Then:
- Set `EMAIL_FROM` = `HeyBell <login@heybell.app>`.
- Add the secret: `security find-generic-password -s "Threadline Resend" -a RESEND_API_KEY -w | npx wrangler secret put RESEND_API_KEY`. Aki stores the key in Keychain first; never paste it into files.

### 4b-A. Cloudflare Email Routing (receiving, free)

Zone → **Email → Email Routing → Get started**.
- Cloudflare adds `MX @ route1/route2/route3.mx.cloudflare.net` and `TXT @ "v=spf1 include:_spf.mx.cloudflare.net ~all"` for you.
- Add routes `hello@`, `support@` and `dmarc@` → Aki's verified Gmail. Catch-all → drop.

### 4b-B. Google Workspace (receiving and sending as a person, instead of 4b-A)

1. Workspace signup with domain `heybell.app` (Aki, paid). Verify with the TXT record Google gives (`google-site-verification=...`).
2. `MX @ smtp.google.com` priority **1**. This single record is Google's current value; remove any Email Routing MX records.
3. `TXT @ "v=spf1 include:_spf.google.com ~all"`. One SPF record at the apex only; Resend's SPF lives on `send.` so it never conflicts.
4. DKIM: Admin console → Apps → Google Workspace → Gmail → Authenticate email → Generate new record (2048-bit). Add `TXT google._domainkey "v=DKIM1; k=rsa; p=..."`, then click **Start authentication**.

### 4c. DMARC (both options)

Start in monitor mode:

```
TXT  _dmarc  "v=DMARC1; p=none; rua=mailto:dmarc@heybell.app; adkim=r; aspf=r; pct=100"
```

After 2 weeks of clean reports (Resend and Google/Cloudflare all aligned):

```
TXT  _dmarc  "v=DMARC1; p=quarantine; rua=mailto:dmarc@heybell.app; adkim=r; aspf=r; pct=100"
```

Move to `p=reject` after 30 more clean days. Gmail and Yahoo bulk-sender rules require at least SPF or DKIM alignment plus a DMARC record; this setup meets that.

Cold outreach must **never** use heybell.app. gtm's lookalike sending domains (NEEDS-AKI) get their own SPF/DKIM/DMARC.

## 5. Verify (anyone, read-only)

```bash
D=heybell.app
dig +short NS $D
curl -sI https://$D | head -5                        # 200 from the app, valid cert
curl -sI https://www.$D | grep -i '^location'         # https://heybell.app/
curl -sI https://getheybell.com/pricing | grep -i '^location'   # https://heybell.app/pricing
curl -s https://$D | grep -o '<link rel="canonical"[^>]*>\|og:url" content="[^"]*'   # absolute URLs use heybell.app
dig +short MX $D ; dig +short TXT $D ; dig +short TXT _dmarc.$D
dig +short TXT resend._domainkey.$D ; dig +short TXT send.$D ; dig +short MX send.$D
```

App checks:
- Sign up with a real inbox. The magic link comes from `login@heybell.app` and points at `https://heybell.app/auth/magic/...`. In Gmail "Show original", SPF, DKIM and DMARC all say PASS.
- Google sign-in round-trips on heybell.app.
- `/robots.txt` and the sitemap (blog agent) list heybell.app URLs.
- Send a test to https://www.mail-tester.com and aim for 9/10 or better.

## 6. Rollback

- DNS and redirect rules are instant to remove.
- Remove the `routes` entry and set `APP_URL` back to the workers.dev URL, then redeploy. Old links keep working because workers.dev was never disabled.
- Domains stay registered (no refunds); nothing else is lost.
