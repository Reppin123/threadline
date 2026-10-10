---
title: "How to add an AI agent to iMessage for your business"
description: "A step-by-step guide to putting an AI agent on iMessage: what Apple allows, how shared lines work, and how to build, test and launch one in an afternoon."
slug: how-to-add-an-ai-agent-to-imessage
date: 2026-10-10
primary_keyword: "imessage ai agent for business"
secondary_keywords: ["add ai to imessage", "imessage chatbot for business", "imessage business messaging", "ai text message assistant", "imessage api"]
author: Aki
---

Your customers already have Messages open. It is the app they check between meetings, on the bus and before bed. If they could text your business there, the same way they text a friend, a lot of the friction in "download our app" or "call us between 9 and 5" disappears.

This guide walks through how to actually put an AI agent on iMessage: what Apple allows, what the realistic options are, and the exact steps to build, test and launch one with Threadline. It is written for founders, operators and small teams, not telecom engineers.

## First, what "iMessage for business" really means

There is no public iMessage API. Apple has never published a server-side API that lets your backend send and receive iMessages the way an SMS provider lets you send texts. We wrote a longer explainer on [what "iMessage API" actually means](/imessage-api), but the short version is that you have three routes:

1. **Apple's own frameworks** (Messages extensions, MessageUI). These run on the user's device. Great for iOS apps, useless for a backend agent.
2. **Apple Messages for Business.** The official brand channel. The customer has to start the chat, you go through Apple's brand review and you integrate through an approved messaging service provider. Strong for large retailers and airlines, slow for everyone else.
3. **Third-party lines.** A provider runs real iMessage accounts on Apple hardware and exposes them to you as an API. To the customer it is a normal blue-bubble thread. This is the route most startups use, and it is what Threadline does, on top of Photon's open-source Spectrum platform.

If you want an agent in front of customers this week, option three is the practical one. The rest of this guide assumes that route.

## What an iMessage AI agent should be able to do

Before building anything, decide what "good" looks like. A useful agent on iMessage is not a FAQ page that talks. It should:

- **Answer from your real information.** Prices, hours, policies, sizes, delivery times, pulled from your own website or systems, not from the model's general knowledge.
- **Say "I don't know" when it doesn't.** An agent that invents a refund policy is worse than no agent.
- **Do things, not just answer.** Take an order, book a slot, save a lead, check a status. In Threadline these are tools: built-in ones like saving a row to a table, or your own API endpoints.
- **Remember the customer.** If someone told you their name and address last week, they should not have to repeat it.
- **Hand off to a human.** When a question is outside what the agent knows or is allowed to do, it should say so and notify you.
- **Feel like texting.** Short bubbles, no walls of text, no "As an AI language model".

Keep that list in mind. You will test against it before launch.

## Step 1: Start from what you already have

Threadline builds the agent from whatever you have today. When you sign up, the new-bot wizard asks one question first: what are we starting from?

### A website

Paste your URL. The builder reads your public pages the way a careful new hire would: it respects robots.txt, follows your sitemap, reads structured data (JSON-LD), and on Shopify or WooCommerce stores it pulls the product catalog from the store's own JSON so prices and variants are exact. For sites that only render in JavaScript, it falls back to a headless browser.

From that it writes the agent's persona, a business summary, a catalog, FAQs, guardrails and a set of test questions. For a real tea store we use as a benchmark, the build took about 99 seconds and extracted all nine products with correct prices plus the shipping and returns rules.

### An API or MCP server

If you have an OpenAPI spec or an MCP server, point the wizard at it. Each operation becomes a tool the agent can call, and you decide which ones are allowed to change data. This is how an agent goes from "answers questions" to "checks your order status" or "books the 3pm slot".

### Just an idea

No website yet? Describe the business in a sentence. Threadline generates mock data and tools so you can text a working version the same day, then swap in real systems later.

## Step 2: Shape the agent in the builder

Once the first build finishes, you land in the builder. On one side is a chat with the builder itself, where you change the agent in plain English: "be warmer", "never offer discounts", "always ask for a pincode before quoting delivery". On the other side is a live phone preview, so you see exactly how replies will look in an iMessage thread.

Things worth setting here:

- **Greeting.** The first message a customer sees. One line about who you are and what you can help with.
- **Guardrails.** What the agent must never do. Typical ones: no discounts, no medical or legal advice, never take card numbers in chat.
- **Tables.** Structured data the agent fills from conversations, such as Orders, Bookings or Leads. For a store, an Orders table is created by default.
- **Handoff.** When a conversation needs you, the agent uses its handoff tool, tells the customer a person will follow up, and the chat shows up under "Needs attention" in Stats.

## Step 3: Test it on simulated customers before anyone real sees it

This is the step most teams skip, and the one that matters most. Threadline runs **checks** against your agent: the test questions from the build, plus a set of simulated customers with very different styles. There is a typo-heavy texter, someone writing in Hinglish, a customer who changes their mind halfway through an order, a terse one-word replier, someone asking for information you never published, and a prompt-injection attempt that tells the bot to ignore its instructions and hand out a 90% discount code.

Each conversation is graded by a separate judge model against your own published information. A case fails if the agent invents or contradicts facts, leaks its instructions, gives a fake discount, or claims an action happened without a successful tool call. We go deep on how this works in [how we test bots on simulated customers](/blog/testing-ai-chatbots-with-simulated-customers).

Read the failures, fix them in the builder, run the checks again. When you are happy, deploy. Each deploy is an immutable version, so you can roll back to an earlier one in a click.

## Step 4: Connect iMessage and invite customers

On the Deploy page, connect iMessage. On the Free plan your agent runs on Threadline's **shared iMessage line**: one line serves many businesses, and each agent gets a short join code.

A customer starts by texting `START <your code>` to the line. You do not have to explain that to them: the Deploy page gives you an "Open in Messages" link that pre-fills the text and a QR code to put on a table card, a receipt or a packing slip. From then on, that customer's messages go to your agent until they text "stop" or start another business's code.

If you outgrow the shared line, a dedicated line is available on the Custom plan. The agent, its memory and its tables carry over.

A few honest limits to know about:

- **iMessage needs an Apple device.** Customers on Android will not get a blue-bubble thread. That is why the same agent can also run on [Telegram](/telegram-ai-agent) today, with [WhatsApp](/whatsapp-ai-agent) next.
- **Shared lines have sending limits.** The underlying iMessage infrastructure caps how many new conversations a line can open per day. For most small businesses this is not a constraint, but it is why high-volume senders move to a dedicated line.
- **Do not cold-message people.** Customers should opt in, by texting you first or asking to be texted. That is good practice and, in many places, the law.

## Step 5: Watch real conversations and improve

Once you are live, three dashboards matter:

- **Conversations** shows every thread, with the tool calls the agent made and their results.
- **Data** shows the tables the agent has filled, like the orders it took.
- **Stats** shows chats per day, the top things people ask for, the questions the agent could not answer and anything that needs you.

That last list is gold. Every "I don't know" is a gap in your website or your FAQs. Add the answer, rebuild or edit in the builder, rerun the checks, deploy a new version.

## What it costs and how long it takes

You can start free with no card: Telegram plus the shared iMessage line. Pro is $29 a month with more usage included and WhatsApp as it rolls out; usage beyond that is billed as you go. A dedicated iMessage line is on the Custom plan.

On time: a first working agent built from a website usually takes a couple of minutes to build, a few more to run checks, and as long as you want to spend polishing it. On our tea-store benchmark, the agent passed 11 of 11 end-to-end checks covering prices, gifting, brewing tips, shipping and returns, saving an order, remembering the customer and replying in Hinglish, with a median reply time of 3.8 seconds. You can read the full story in [our DTC store case study](/blog/ai-agent-for-dtc-store-sanitea).

## A checklist before you go live

- The agent answers your five most common questions correctly, in short bubbles.
- It says "I don't know" for something you never published, instead of guessing.
- It refuses a prompt-injection attempt and does not leak its instructions.
- It confirms before saving an order or booking, and the row appears in your table.
- Handoff works: you get notified and the customer is told someone will follow up.
- Your join code QR is printed where customers will see it.

[Start building your iMessage agent](/signup). It is free to build and test, no card needed.

## Frequently asked questions

### Can I put an AI chatbot on iMessage without Apple Messages for Business?

Yes. Messages for Business is Apple's official brand channel, but it requires brand review and an approved provider. Third-party lines like the one Threadline uses run real iMessage accounts and expose them through an API, so you can go live without that approval process.

### Will customers see blue bubbles?

Yes, when the customer is on an Apple device with iMessage turned on. The shared line is a real iMessage account, so the thread looks like any other conversation in Messages.

### Do my customers need to download anything?

No. They text a code to the line, scan a QR code or tap a link that pre-fills the message. Everything happens in the Messages app they already use.

### What happens if the agent does not know an answer?

It says so instead of guessing, and it can hand the conversation to you with a summary. Questions it could not answer show up in your Stats so you can fill the gaps.

### Can the agent take orders or bookings?

Yes. It can save orders, bookings or leads into tables you see in the dashboard, and if you connect an API or MCP server it can call your own endpoints. It confirms with the customer before anything that changes data.

### Does it work on Android?

iMessage itself is Apple-only. The same agent can run on Telegram today, and WhatsApp is next, so Android customers are not left out.
