import Link from "next/link";
import { DocPage, docMetadata, type Section } from "../_components/DocPage";
import { GUIDES, type Faq } from "@/components/site/data";

const PATH = "/telegram-ai-agent";
const GUIDE = GUIDES.find((g) => g.href === PATH)!;

export const metadata = docMetadata({
  path: PATH,
  title: "Telegram AI agent: from BotFather token to useful agent",
  description:
    "Create a Telegram bot with BotFather, receive updates by webhook, and give your AI agent tools that call your backend safely.",
});

const FAQS: Faq[] = [
  {
    q: "Is the Telegram Bot API free?",
    a: "Yes. Telegram does not charge for the Bot API. You pay only for your own hosting and for the language model your agent uses.",
  },
  {
    q: "Webhooks or long polling?",
    a: "Webhooks for production: Telegram pushes each update to your HTTPS endpoint as it happens. Long polling with getUpdates is handy for local development but needs a process running at all times.",
  },
  {
    q: "What if my bot token leaks?",
    a: "Revoke it immediately in BotFather and issue a new one, then update your webhook. Anyone with the token can read updates and send messages as your bot.",
  },
  {
    q: "Can I connect an existing bot to Threadline?",
    a: "Yes. Paste the token from BotFather when you connect the Telegram channel. Threadline registers the webhook and routes messages to the same agent you use on iMessage.",
  },
];

const SECTIONS: Section[] = [
  {
    id: "why-telegram",
    title: "Why Telegram is a friendly place to start",
    body: (
      <>
        <p>
          Of the major chat apps, Telegram has the most open bot platform. There is no business verification, no
          per-message fee and no review before your bot can talk to people. You create a bot in a minute, point it at a
          server and start receiving messages. That makes it a good place to prove out an AI agent before you take it to
          more restricted channels.
        </p>
      </>
    ),
  },
  {
    id: "botfather",
    title: "Step 1: Get a token from BotFather",
    body: (
      <>
        <p>
          Every Telegram bot is created through <strong>@BotFather</strong>, Telegram's own bot for managing bots. Open
          a chat with it, send <code>/newbot</code>, choose a display name and a username ending in “bot”, and BotFather
          replies with an API token that looks like <code>123456789:AA…</code>.
        </p>
        <p>
          Treat that token like a password. Store it in a secrets manager or environment variable, never in source
          control. While you are in BotFather, set a description, an About text and a profile photo, and register a
          short list of commands with <code>/setcommands</code> so people know what the bot can do.
        </p>
      </>
    ),
  },
  {
    id: "webhooks",
    title: "Step 2: Receive updates by webhook",
    body: (
      <>
        <p>
          Telegram delivers incoming messages as <strong>updates</strong>. In production, register an HTTPS endpoint
          with <code>setWebhook</code> and Telegram will POST each update to it as JSON.
        </p>
        <pre>
          <code>{`curl https://api.telegram.org/bot$TOKEN/setWebhook \\
  -d url=https://example.com/telegram/webhook \\
  -d secret_token=$WEBHOOK_SECRET`}</code>
        </pre>
        <p>A few details save a lot of debugging later:</p>
        <ul>
          <li>
            Check the <code>X-Telegram-Bot-Api-Secret-Token</code> header on every request so only Telegram can call
            your endpoint.
          </li>
          <li>
            Respond with 200 quickly and do the model work asynchronously. Slow responses cause Telegram to retry, and
            retries mean duplicate replies.
          </li>
          <li>
            De-duplicate on <code>update_id</code>. Even with fast responses, at-least-once delivery is the rule.
          </li>
          <li>Send a typing indicator with <code>sendChatAction</code> while the agent thinks.</li>
        </ul>
      </>
    ),
  },
  {
    id: "tools",
    title: "Step 3: Give the agent tools, safely",
    body: (
      <>
        <p>
          A model that can only talk is a FAQ page with extra steps. The agent becomes useful when it can call
          <strong> tools</strong>: functions that look up an order, book an appointment or create a ticket in your
          backend.
        </p>
        <ul>
          <li>
            <strong>Map identity explicitly.</strong> A Telegram user ID is stable but anonymous. Link it to an account
            through a one-time login link before exposing anything private.
          </li>
          <li>
            <strong>Scope every tool call to that user.</strong> Your backend, not the prompt, decides what a given user
            can see and change.
          </li>
          <li>
            <strong>Confirm destructive actions.</strong> Inline keyboard buttons work well for “Yes, cancel it” style
            confirmations.
          </li>
          <li>
            <strong>Log tool calls and results</strong> so you can review exactly what the agent did in each
            conversation.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "groups",
    title: "Groups, privacy mode and formatting",
    body: (
      <>
        <p>
          Bots can be added to groups. By default, privacy mode means the bot only sees commands and messages that
          mention it, which is usually what you want for an agent. Telegram supports a subset of Markdown and HTML for
          formatting; escape model output before sending, or a stray character will make the API reject the message.
        </p>
      </>
    ),
  },
  {
    id: "threadline",
    title: "Doing it with Threadline",
    body: (
      <>
        <p>
          Threadline handles the plumbing above: webhook registration, signature checks, de-duplication, typing
          indicators and formatting. You paste your BotFather token, and the agent you built and tested for{" "}
          <Link href="/imessage-api">iMessage</Link> starts answering on Telegram with the same tools. For how the
          pieces fit across channels, see the guide to a <Link href="/messaging-api">unified messaging API</Link>.
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
