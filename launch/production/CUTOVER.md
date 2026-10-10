# Production cutover: custom domain, APP_URL, OAuth, email, Photon plan

Production agent, 2026-10-10. This is the app/infra side. DNS purchase and zone steps are in **launch/domain/CUTOVER.md** (domain agent);
this file references its sections instead of repeating them. Every step marked **Aki** spends money, accepts terms, changes DNS or deploys.

Variables used below:

```bash
DOMAIN=heybell.app                   # domain decision (COORDINATION 2026-10-10). Fallback name: threadline.chat
APP_URL=https://$DOMAIN
OLD=https://threadline.akshitbansal1313.workers.dev
```

## 0. Preconditions (check all before starting)

- [ ] Domain bought in the **same Cloudflare account** as the `threadline` Worker (domain CUTOVER §0 to §1). `dig +short NS $DOMAIN` shows Cloudflare.
- [ ] Code from this branch is what will deploy (`git log --oneline -5` includes the production commits) and `pnpm smoke` passed on it.
- [ ] `node scripts/restore-drill.mjs --real` passes (proves the current snapshot restores) and a fresh local copy exists (RUNBOOK §6).
- [ ] Off-peak window: US night (02:00 to 05:00 ET). The container is replaced, about 1 to 2 minutes of downtime (AUDIT §4).

## 1. Secrets into Keychain (Aki, once; never paste values into files or chat)

`deploy.sh` pushes these to the Worker if present. Service name **"Threadline Ops"**, account = variable name:

```bash
security add-generic-password -U -s "Threadline Ops" -a RESEND_API_KEY -w          # prompts for the value
security add-generic-password -U -s "Threadline Ops" -a ALERT_WEBHOOK_URL -w       # Slack/Discord incoming webhook URL
security add-generic-password -U -s "Threadline Ops" -a SENTRY_DSN -w              # Sentry project DSN (free Developer plan)
security add-generic-password -U -s "Threadline Ops" -a GOOGLE_CLIENT_ID -w        # optional, Google sign-in
security add-generic-password -U -s "Threadline Ops" -a GOOGLE_CLIENT_SECRET -w
security add-generic-password -U -s "Threadline Ops" -a STRIPE_SECRET_KEY -w       # TEST mode key (sk_test_...) until billing go-live
security add-generic-password -U -s "Threadline Ops" -a STRIPE_WEBHOOK_SECRET -w   # from the webhook endpoint in step 4
security add-generic-password -U -s "Threadline Ops" -a CF_BEACON_TOKEN -w         # Cloudflare Web Analytics site token
```

The Stripe code refuses `sk_live_` keys unless `STRIPE_ALLOW_LIVE=1` (billing agent), so a mixed-up key cannot charge anyone.

## 2. Email before traffic (Aki)

1. Resend: create account, add domain `$DOMAIN`, records via "Sign in to Cloudflare" (domain CUTOVER §4a; record list + DMARC plan in EMAIL.md).
2. Upgrade to **Resend Pro ($20/mo)** before any launch post: Free is 100 emails/day (AUDIT 2.5).
3. Cloudflare Email Routing for `hello@`, `support@`, `dmarc@` → Aki's inbox (domain CUTOVER §4b-A).
4. Verify: `dig +short TXT resend._domainkey.$DOMAIN` returns the key and Resend shows the domain "Verified".

## 3. Worker config (production prepares, Aki deploys)

Edit `deploy/cloudflare/wrangler.jsonc` (both lines are already there as comments):

```jsonc
  "vars": { "APP_URL": "https://heybell.app", "BRAND_NAME": "HeyBell", "EMAIL_FROM": "HeyBell <login@heybell.app>" },
  "routes": [{ "pattern": "heybell.app", "custom_domain": true }],
```

- `custom_domain: true` creates the DNS record and certificate on deploy (the hostname must not already have a CNAME).
- Keep `workers_dev` on so the old URL keeps working during the switch. Keep container instance name `main-v2`.
- `BRAND_NAME` only if Aki confirmed the rename (it changes email copy; site copy is the web owner's find-replace).
- `www` and `getheybell.com` redirects: domain CUTOVER §2b and §2c (dashboard rules, no code).

Deploy (**Aki**): `deploy/cloudflare/deploy.sh`. It prints `healthz 200` at the end when the container is up.

## 4. Things that hold the old URL (Aki, in dashboards)

| Where | Change | Keep old until |
|---|---|---|
| Google Cloud Console → OAuth client | Add redirect URI `https://heybell.app/auth/google/callback` and JS origin `https://heybell.app` | step 6 passes |
| Stripe (test mode) → Developers → Webhooks | Add endpoint `https://heybell.app/api/stripe/webhook`, events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `invoice.paid`. Put its signing secret in Keychain (step 1) and redeploy | 7 days (Stripe retries to the old one) |
| Stripe → Settings → Customer emails | Turn on receipts for successful payments | n/a |
| Cloudflare → Web Analytics | Add site `heybell.app`, copy the token into `CF_BEACON_TOKEN` | n/a |
| Photon dashboard | Nothing: the SDK stream and Telegram long-polling have no callback URL | n/a |

Checkout/Portal return URLs are built from `APP_URL` at request time, so they switch with the deploy.

## 5. Photon production plan and the line decision

| Plan | Price | What it allows | Fit |
|---|---|---|---|
| Free (today) | $0 | 10 end users total, allowlisted, shared pool | Demo only. Cannot serve one customer's audience |
| Pro | $25/mo | 100 end users total, shared pool | Private beta with 3 to 5 design partners |
| Business | $250/line/mo | Dedicated number, unlimited users, 50 new contacts/line/day, 5,000 outbound messages/server/day | Public launch |
| Enterprise | custom | Several lines, lowest throttling, SLA | Past ~30 customers (AUDIT §5, §7) |

Source: research/photon/pricing.txt and docs-full.txt L2457-2458, L4676-4679.

**Decision (production, for Aki to approve in NEEDS-AKI):**
1. **Now to public launch: Pro ($25/mo)** for the design-partner beta. Bot-texts-first flow as built.
2. **Public launch: Business, one dedicated line ($250/mo) shared by every bot**, `IMESSAGE_LINE_HANDLE` set to its number. With a fixed
   number, end customers text first ("start <code>", QR or `sms:` link already on the Deploy page). That also fixes the iOS 26
   Unknown Senders problem gtm raised, because the thread starts from the customer's side.
3. Bot-texts-first stays only for the owner's own phone and invites, which keeps us far under 50 new contacts/day per line.
4. Customers on the $399 dedicated-number add-on get their own Business line (we pay $250, 34% margin, gtm PRICING §2).
5. Open question for Photon before step 2: does a customer-initiated thread count against the 50 new contacts/day? If yes, budget
   one extra line per ~1,500 new end customers a month (AUDIT §7).

Config for step 2: store the E.164 number as Keychain "Threadline Ops" / `IMESSAGE_LINE_HANDLE`; `deploy.sh` pushes it. No code change.

## 6. Verify (anyone, right after the deploy)

```bash
curl -s https://heybell.app/healthz | python3 -m json.tool        # ok: true, gateway.connected includes imessage, queue.backlog false
curl -sI https://www.heybell.app/pricing | grep -i location       # 301 → https://heybell.app/pricing
curl -sI https://getheybell.com/ | grep -i location               # 301 → https://heybell.app/
curl -s -o /dev/null -w "%{http_code}\n" https://heybell.app/login  # 200
BASE_URL=https://heybell.app scripts/smoke.sh                     # only the web_landing / web_login rows apply (the rest probe localhost)
```
By hand (Aki): sign up with a new email → link arrives from `login@heybell.app`, Gmail "Show original" shows SPF/DKIM/DMARC pass →
welcome email arrives → Google sign-in works → build a bot from a URL → text it on Telegram → Stripe test checkout → "You're on
Starter" email → Better Stack shows the monitor green.

## 7. After a week

- Set Worker var `CANONICAL_HOST=heybell.app`: browser GETs to the workers.dev host get a 301; `/api/*` (Stripe, API clients) keeps working.
- Remove the old OAuth redirect URI and the old Stripe webhook endpoint.
- DMARC to `p=quarantine` if reports are clean (EMAIL.md).

## Rollback

The domain is additive: the workers.dev URL keeps serving the same container. If the new domain misbehaves, set `APP_URL` back to `$OLD`
and redeploy (sign-in links and OAuth go back to the old host). Data is unaffected either way. Code rollback: RUNBOOK §4.
