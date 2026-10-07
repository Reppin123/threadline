import Link from "next/link";
import { DocPage, docMetadata, type Section } from "../_components/DocPage";
import { GUIDES, type Faq } from "@/components/site/data";

const PATH = "/whatsapp-ai-agent";
const GUIDE = GUIDES.find((g) => g.href === PATH)!;

export const metadata = docMetadata({
  path: PATH,
  title: "Building a WhatsApp AI agent that finishes the job",
  description:
    "How to build a WhatsApp AI agent that completes real tasks: tie messages to operations in your app, respect the 24-hour window, use templates well and launch one workflow at a time.",
});

const FAQS: Faq[] = [
  {
    q: "What is the WhatsApp 24-hour window?",
    a: "When a customer messages your business, you have 24 hours to reply with free-form messages. After that, you can only reach them with a pre-approved template message until they write back.",
  },
  {
    q: "Do I need a WhatsApp Business account?",
    a: "Yes. Business messaging runs on the WhatsApp Business Platform, which requires a verified business and a phone number registered to it, either directly with Meta or through a provider.",
  },
  {
    q: "Can the agent hand off to a human?",
    a: "It should. Give the agent an explicit handoff tool that flags the conversation for your team, and tell the customer when a person will follow up.",
  },
  {
    q: "Is it the same agent as on iMessage?",
    a: "With Threadline, yes. You build the agent once and connect channels; WhatsApp-specific rules like templates and the reply window are handled at the channel layer.",
  },
];

const SECTIONS: Section[] = [
  {
    id: "finish-the-job",
    title: "Answering is not the same as finishing",
    body: (
      <>
        <p>
          Most WhatsApp bots fail in a predictable way. They answer questions fluently and then send the customer to a
          link to actually do the thing. The customer wanted to reschedule a delivery, and instead they got a paragraph
          about delivery policies.
        </p>
        <p>
          A useful WhatsApp AI agent closes the loop inside the thread. It looks up the order, offers the slots that are
          really available, books the one the customer picks and confirms it. That requires two things: a connection to
          the systems that run your business, and respect for the rules WhatsApp places on business messaging.
        </p>
      </>
    ),
  },
  {
    id: "tie-to-operations",
    title: "Tie every message to a real operation",
    body: (
      <>
        <p>
          Start from the operations your customers already do in your app or on the phone with support: check status,
          change a booking, cancel, reorder, update an address. Each one becomes a <strong>tool</strong> the agent can
          call, backed by an endpoint in your API.
        </p>
        <ul>
          <li>Keep tools narrow. “Reschedule delivery” is better than “update order”.</li>
          <li>Validate inputs on your side, not in the prompt. The model proposes; your backend decides.</li>
          <li>Return structured results so the agent can confirm exactly what changed.</li>
          <li>Require confirmation before anything irreversible, such as a cancellation or a charge.</li>
        </ul>
        <p>
          Identity matters here. WhatsApp gives you the customer's phone number, which you can match to an account, but
          for sensitive actions a one-time code or a signed link is worth the extra step.
        </p>
      </>
    ),
  },
  {
    id: "24-hour-window",
    title: "Respect the 24-hour window",
    body: (
      <>
        <p>
          WhatsApp separates conversations a customer starts from messages a business sends unprompted. When a customer
          writes to you, a <strong>24-hour customer service window</strong> opens and you can reply freely. Once it
          closes, you can only send <strong>template messages</strong>: pre-approved formats for things like order
          updates, reminders and verification codes.
        </p>
        <p>This shapes agent design in a few practical ways:</p>
        <ul>
          <li>Finish multi-step tasks while the window is open instead of promising to “get back to you tomorrow”.</li>
          <li>If something will complete later, such as a refund, send the update as an approved template.</li>
          <li>Track the window per conversation so the agent never tries to send a free-form message it cannot deliver.</li>
        </ul>
      </>
    ),
  },
  {
    id: "templates",
    title: "Use templates for what they are good at",
    body: (
      <>
        <p>
          Templates are reviewed by Meta and categorized as utility, authentication or marketing. Utility templates tied
          to something the customer did, such as “Your order shipped”, are the most useful for an agent. Keep them
          short, include a variable or two, and end with a reply prompt that reopens the window so the agent can take
          over again.
        </p>
        <p>
          Avoid using templates as a back door for promotions. Customers can block or report you, and quality ratings
          affect how many messages you are allowed to send.
        </p>
      </>
    ),
  },
  {
    id: "one-workflow",
    title: "Launch one workflow at a time",
    body: (
      <>
        <p>
          The fastest way to a good WhatsApp agent is to launch something small. Pick the single most common request,
          wire up the tools it needs and test it against realistic customer messages, including the rude, vague and
          off-topic ones. Then watch real conversations, fix what breaks and add the next workflow.
        </p>
        <p>
          In Threadline, every agent runs against simulated customers before it goes live, and the same agent can serve{" "}
          <Link href="/imessage-api">iMessage</Link> and <Link href="/telegram-ai-agent">Telegram</Link>. WhatsApp
          becomes one more doorway into workflows you have already proven.
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
