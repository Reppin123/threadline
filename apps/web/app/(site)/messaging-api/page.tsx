import Link from "next/link";
import { DocPage, docMetadata, type Section } from "../_components/DocPage";
import { GUIDES, type Faq } from "@/components/site/data";

const PATH = "/messaging-api";
const GUIDE = GUIDES.find((g) => g.href === PATH)!;

export const metadata = docMetadata({
  path: PATH,
  title: "Unified messaging API: one backend for every chat app",
  description:
    "How to design one messaging backend for iMessage, Telegram and WhatsApp: a shared workflow and message lifecycle, with per-channel identity and delivery rules.",
});

const FAQS: Faq[] = [
  {
    q: "What is a unified messaging API?",
    a: "A single interface your application uses to send and receive messages across several chat apps, so business logic is written once and each channel is handled by an adapter.",
  },
  {
    q: "Should I normalize everything to plain text?",
    a: "Normalize to a common message model, but keep room for channel features. A list of options can be buttons on Telegram, a list message on WhatsApp and a numbered reply on iMessage.",
  },
  {
    q: "Can one customer be recognized across channels?",
    a: "Only if you link the identities yourself, for example by having the customer sign in or confirm a code. Never assume two channel identities are the same person.",
  },
  {
    q: "Which channels does Threadline support?",
    a: "iMessage first, then Telegram and WhatsApp. All three run the same agent and tools through one backend.",
  },
];

const SECTIONS: Section[] = [
  {
    id: "the-problem",
    title: "The problem with one integration per channel",
    body: (
      <>
        <p>
          Teams usually add chat channels one at a time. The iMessage integration gets its own webhook handler, then
          Telegram gets another, then WhatsApp a third, each with its own idea of what a conversation is. Six months
          later a bug fix to the booking flow has to be made in three places, and only two of them get it.
        </p>
        <p>
          A unified messaging API avoids that by splitting the system into two layers: a shared core that knows about
          customers, conversations and workflows, and thin channel adapters that know about the quirks of each app.
        </p>
      </>
    ),
  },
  {
    id: "shared-core",
    title: "What belongs in the shared core",
    body: (
      <>
        <p>The core should not care where a message came from. It owns:</p>
        <ul>
          <li>
            <strong>The message lifecycle:</strong> received, queued, processing, replied, delivered, failed. Every
            channel reports into the same states.
          </li>
          <li>
            <strong>Conversations and memory:</strong> what the customer said, what the agent did, which tools it
            called.
          </li>
          <li>
            <strong>Workflows and tools:</strong> the operations your agent can perform against your backend.
          </li>
          <li>
            <strong>Policies:</strong> rate limits, handoff to humans, retention and audit logs.
          </li>
        </ul>
        <p>
          When this layer is shared, improving a workflow improves it everywhere, and your test suite runs once against
          the core instead of three times against three integrations.
        </p>
      </>
    ),
  },
  {
    id: "adapters",
    title: "What stays in each channel adapter",
    body: (
      <>
        <p>Adapters translate between the core and each app. They are where the differences live:</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Concern</th>
                <th scope="col">iMessage</th>
                <th scope="col">Telegram</th>
                <th scope="col">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Identity</td>
                <td>Phone or Apple ID</td>
                <td>User ID</td>
                <td>Phone number</td>
              </tr>
              <tr>
                <td>Who starts</td>
                <td>Customer</td>
                <td>Customer</td>
                <td>Customer, or template</td>
              </tr>
              <tr>
                <td>Reply limits</td>
                <td>None formal</td>
                <td>Rate limits</td>
                <td>24-hour window</td>
              </tr>
              <tr>
                <td>Rich UI</td>
                <td>Text, links, media</td>
                <td>Buttons, Markdown</td>
                <td>Lists, buttons</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          An adapter verifies inbound webhooks, maps the payload to the core message model, and renders outbound
          replies in the best form the channel supports. It also enforces channel rules, such as refusing to send a
          free-form WhatsApp message outside the reply window.
        </p>
      </>
    ),
  },
  {
    id: "identity",
    title: "Keep identities separate until proven otherwise",
    body: (
      <>
        <p>
          It is tempting to merge a customer's WhatsApp number with the same number on iMessage. Resist it. Numbers get
          recycled, family members share devices, and a Telegram ID carries no contact details at all. Store a channel
          identity per conversation and link it to an account only after an explicit verification step. Your tools
          should always run as the verified account, never as a guessed one.
        </p>
      </>
    ),
  },
  {
    id: "delivery",
    title: "Design for at-least-once delivery",
    body: (
      <>
        <p>
          Every chat platform retries webhooks, and every network drops packets. Give each inbound message an
          idempotency key from the channel's own message ID, acknowledge webhooks quickly, and process the work from a
          queue. Make tool calls idempotent too, so a retried “book this slot” does not create two bookings.
        </p>
      </>
    ),
  },
  {
    id: "threadline",
    title: "How Threadline is built",
    body: (
      <>
        <p>
          Threadline follows this design. You build one agent with one set of tools, test it against simulated
          customers, and connect channels to it. <Link href="/imessage-api">iMessage</Link> runs on a shared line with
          join codes, <Link href="/telegram-ai-agent">Telegram</Link> uses your BotFather token and{" "}
          <Link href="/whatsapp-ai-agent">WhatsApp</Link> respects templates and the reply window, all on top of the
          same message lifecycle.
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <DocPage
      path={PATH}
      eyebrow={GUIDE.nav}
      title={GUIDE.title}
      lede={GUIDE.blurb}
      sections={SECTIONS}
      faqs={FAQS}
    />
  );
}
