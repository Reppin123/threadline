<!--
DRAFT for lawyer review. Not legal advice. Prepared by the legal launch agent, 2026-10-10. Publish at /subprocessors.
Vendor facts (DPA URLs, incorporation, regions): launch/legal/research/platforms.md s.4, apple-photon.md s.3.7, privacy.md s.0.
Items in [brackets] must be confirmed by Aki before publishing: Supabase project region, Photon DPA status.
The Sentry row promises message text and phone numbers are removed: true only after production adds scrubbing (COORDINATION legal 2026-10-10).
Customer-facing copy: no em dashes.
-->

# Subprocessors

Last updated: [DATE]

HeyBell uses the companies below to run the service. Those marked **Subprocessor** process personal data that our customers send through HeyBell (including their end users' messages) on our behalf, under written terms at least as protective as our [Data Processing Addendum](/dpa). Those marked **Channel** or **Independent** are services our customers choose to use, or that act under their own privacy terms.

We will post changes here and email account owners who subscribe to updates at least **30 days** before a new subprocessor starts processing customer personal data. Customers can object as described in DPA section 6.

## Subprocessors

| Company | What it does for HeyBell | Personal data involved | Location | Their data terms |
|---|---|---|---|---|
| **Anthropic, PBC** (USA) | Writes agent replies, builds agents, runs quality checks | Message content, memories, website content, agent configuration | United States | [Commercial Terms](https://www.anthropic.com/legal/commercial-terms) and [DPA](https://www.anthropic.com/legal/data-processing-addendum). No training on our data. Inputs and outputs deleted within 30 days by default |
| **Cloudflare, Inc.** (USA) | Hosts the HeyBell application and database (Workers and Containers), network and DDoS protection, cookieless web analytics | All service data, including messages and phone numbers or chat IDs | Global network; application container in the United States | [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) |
| **Supabase, Inc.** (USA) | Stores encrypted database snapshots (backups), kept up to 30 days | All service data (in backups) | [AWS region: confirm, e.g. us-east-1] | [Supabase DPA](https://supabase.com/legal/dpa) |
| **Something Great Inc. (Photon)** (USA) | Sends and receives iMessage for HeyBell agents | Phone numbers or Apple handles, message content | United States | [Photon terms](https://photon.codes/terms-of-services) [DPA requested, not yet signed] |
| **Functional Software, Inc. (Sentry)** (USA) | Error reporting for HeyBell staff | Technical error data; we remove message text and phone numbers before sending | United States | [Sentry DPA](https://sentry.io/legal/dpa/) |
| **Resend, Inc.** (USA) | Sends sign-in, billing and service emails to customers | Customer name and email address | United States | [Resend DPA](https://resend.com/legal/dpa) |
| **Stripe, Inc.** and affiliates (USA) | Subscription billing, payments, tax | Customer billing name, email, address, payment details. Never end-user messages | United States and Stripe affiliates | [Stripe DPA](https://stripe.com/legal/dpa). Stripe is also an independent controller for fraud prevention and legal compliance |

## Channels chosen by customers

Messages on these networks are also governed by the provider's own terms and privacy policy, which apply between the provider and the people using it. HeyBell does not control them.

| Provider | Role |
|---|---|
| **Apple Inc.** (iMessage) | Messaging network used through Photon. Apple processes message metadata under its own terms |
| **Telegram Messenger Inc.** (Telegram) | Bot platform. The customer is the developer of its Telegram bot under Telegram's Bot Developer Terms |
| **Meta Platforms / WhatsApp LLC** (WhatsApp, when available) | Business messaging platform. The customer holds the WhatsApp Business account |

## Independent services used at sign in

| Provider | Role |
|---|---|
| **Google LLC** | "Sign in with Google" for customers who choose it. Google acts under its own privacy policy. We receive name, email and profile picture only |

## Not active

We hold a standby account with another AI model provider for outages. It is **not** used for customer data today. We will add it to this page and give 30 days' notice before it processes any customer personal data.
