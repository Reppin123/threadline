import Link from "next/link";
import { DocPage, docMetadata, type Section } from "../_components/DocPage";
import { GUIDES, type Faq } from "@/components/site/data";

const PATH = "/imessage-api";
const GUIDE = GUIDES.find((g) => g.href === PATH)!;

export const metadata = docMetadata({
  path: PATH,
  title: "iMessage API: what it actually means for businesses",
  description:
    "There is no public iMessage API. Here is what exists instead: Apple's frameworks, Messages for Business and third-party shared lines, and how to choose between them.",
});

const FAQS: Faq[] = [
  {
    q: "Does Apple offer a public iMessage API?",
    a: "No. Apple does not publish a server-side API for sending or receiving iMessages from your own backend. The official business route is Apple Messages for Business, which goes through an approved messaging service provider.",
  },
  {
    q: "How do customers start a conversation with a Threadline agent?",
    a: "They text START followed by your join code to the shared Threadline number, for example “START acme”. From then on, messages from that number are routed to your agent until they switch to another one.",
  },
  {
    q: "Will my messages show up as blue bubbles?",
    a: "Yes, when the customer is on an Apple device with iMessage turned on. Threadline's shared line is a real iMessage account, so the conversation looks like any other thread in Messages.",
  },
  {
    q: "Can I get my own dedicated number later?",
    a: "Yes. Most teams start on the shared line to validate the agent, then move to a dedicated line once volume justifies it. The agent, tools and conversation history carry over.",
  },
];

const SECTIONS: Section[] = [
  {
    id: "no-public-api",
    title: "There is no public iMessage API",
    body: (
      <>
        <p>
          Search for “iMessage API” and you will find a lot of confident answers that disagree with each other. The
          short version: Apple has never shipped a public, server-side API that lets your backend send and receive
          iMessages the way Twilio lets you send SMS. iMessage is an end-to-end encrypted service tied to Apple IDs and
          Apple hardware, and Apple guards it closely.
        </p>
        <p>
          That does not mean businesses cannot use iMessage. It means the phrase “iMessage API” is shorthand for one of
          three quite different things, each with its own trade-offs. Knowing which one a vendor is actually selling is
          the first question to ask.
        </p>
      </>
    ),
  },
  {
    id: "apple-frameworks",
    title: "1. Apple's developer frameworks",
    body: (
      <>
        <p>
          Apple does ship frameworks that touch Messages, but they run on the user's device, not on your server.{" "}
          <strong>iMessage apps and sticker packs</strong> (built with the Messages framework) live inside the Messages
          app and let people share interactive content in a thread. <strong>MessageUI</strong> lets an iOS app open a
          pre-filled compose sheet that the user still has to send themselves. <strong>Shortcuts and SiriKit</strong>{" "}
          intents can hand messages off to the system.
        </p>
        <p>
          These are great for consumer apps that want to live inside conversations. None of them let a backend service
          hold a two-way chat with a customer, so they are not what most people mean when they want an AI agent on
          iMessage.
        </p>
      </>
    ),
  },
  {
    id: "messages-for-business",
    title: "2. Apple Messages for Business",
    body: (
      <>
        <p>
          Messages for Business is Apple's official channel for brands. Customers start a chat from a button on your
          website, in Maps, in Safari or in Spotlight, and the conversation is delivered to your support stack through an
          approved messaging service provider. It supports rich features like list pickers, time pickers and Apple Pay.
        </p>
        <p>The catch is access. You go through a brand review, you integrate with a provider, and a few rules shape the product:</p>
        <ul>
          <li>The customer must start the conversation; you cannot cold-message someone.</li>
          <li>You get an opaque identifier, not the customer's phone number or email.</li>
          <li>Approval timelines and provider contracts are built for larger companies.</li>
        </ul>
        <p>If you are a large retailer or airline, it is a strong option. If you want an agent running this week, it is a long road.</p>
      </>
    ),
  },
  {
    id: "shared-lines",
    title: "3. Third-party lines",
    body: (
      <>
        <p>
          The third category is what most startups use: a provider runs real iMessage accounts on Apple hardware and
          exposes them to you through webhooks and an HTTP API. To the customer it is a normal blue-bubble thread. To you
          it is a familiar message-in, message-out integration.
        </p>
        <p>Before you build on one, ask:</p>
        <ul>
          <li>
            <strong>Whose number is it?</strong> A dedicated number is yours alone; a shared line routes many businesses
            through one number.
          </li>
          <li>
            <strong>What happens on Android?</strong> Good providers fall back to SMS or tell you clearly that they do not.
          </li>
          <li>
            <strong>How is routing done?</strong> On a shared line, the provider needs a reliable way to know which
            business a message belongs to.
          </li>
          <li>
            <strong>What is stored, and for how long?</strong> Conversation content is sensitive; ask about retention and
            deletion.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-threadline-works",
    title: "How Threadline does it",
    body: (
      <>
        <p>
          Threadline runs a shared iMessage line so you can go live without provisioning hardware or waiting on an
          approval. Each agent gets a short <strong>join code</strong>. A customer texts <code>START &lt;code&gt;</code>{" "}
          to the Threadline number, and from then on their messages route to your agent. Texting a different code
          switches agents; the routing is explicit and the customer is always in control.
        </p>
        <p>
          Behind the line, your agent is the same one you test in the dashboard: built from your website, your API or a
          plain description, run against simulated customers before launch, with tools that call your backend. When you
          outgrow the shared line, you can move to a dedicated number, and the same agent can also answer on{" "}
          <Link href="/telegram-ai-agent">Telegram</Link> and <Link href="/whatsapp-ai-agent">WhatsApp</Link>.
        </p>
      </>
    ),
  },
  {
    id: "choosing",
    title: "Choosing the right path",
    body: (
      <>
        <p>
          If you are building a consumer iOS app, look at Apple's frameworks. If you are an enterprise brand with a
          support team and time for review, Messages for Business is the official route. If you want to put an AI agent
          in front of customers on iMessage quickly and learn from real conversations, a third-party line is the
          practical starting point.
        </p>
        <p>
          Whichever you pick, design the agent around what your customers actually need to get done. The channel is
          only the doorway.
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
