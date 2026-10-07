export const CONTACT_EMAIL = "hello@threadline.app";
export const CONTACT_HREF = `mailto:${CONTACT_EMAIL}`;
export const PUBLISHED = "October 7, 2026";
export const PUBLISHED_ISO = "2026-10-07";

export type Guide = { href: string; channel: string; title: string; blurb: string; nav: string };

export const GUIDES: Guide[] = [
  {
    href: "/imessage-api",
    channel: "iMessage",
    nav: "iMessage API",
    title: "What “iMessage API” actually means",
    blurb: "Apple’s frameworks, Messages for Business and third-party lines — and the questions to ask before you build on one.",
  },
  {
    href: "/whatsapp-ai-agent",
    channel: "WhatsApp",
    nav: "WhatsApp AI agent",
    title: "A WhatsApp agent that finishes the job",
    blurb: "Tie each message to a real operation in your app, respect the 24-hour window and launch one workflow at a time.",
  },
  {
    href: "/telegram-ai-agent",
    channel: "Telegram",
    nav: "Telegram AI agent",
    title: "From BotFather token to useful agent",
    blurb: "Create the bot, take updates by webhook, and give the model tools that talk to your backend safely.",
  },
  {
    href: "/messaging-api",
    channel: "Architecture",
    nav: "Unified messaging API",
    title: "One backend, every chat app",
    blurb: "Share the workflow and message lifecycle across channels while keeping each one’s identity and delivery rules.",
  },
];

export type Faq = { q: string; a: string };

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
