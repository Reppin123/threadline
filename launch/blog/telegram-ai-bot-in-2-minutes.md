---
title: "How to make a Telegram AI bot in 2 minutes (no code)"
description: "Create a bot with @BotFather, paste the token into Threadline and your AI agent answers on Telegram. A no-code, step-by-step guide with the real limits."
slug: telegram-ai-bot-in-2-minutes
date: 2026-10-10
primary_keyword: "how to make a telegram ai bot"
secondary_keywords: ["telegram ai chatbot", "telegram bot no code", "botfather token", "telegram bot for business", "ai agent on telegram"]
author: Aki
category: Tutorial
---

Telegram is the easiest messaging channel in the world to put an AI agent on. There is no business verification, no per-message fee and no approval queue. You talk to a bot called @BotFather, you get a token, and you are live.

The hard part has always been everything after the token: hosting a server, handling updates, wiring up a language model, giving it your business information and making sure it does not say something silly to your customers. This guide shows how to skip all of that and get an AI agent answering on Telegram in about two minutes of clicking, plus a short wait while the agent builds.

Telegram passed 1 billion monthly active users in March 2025 ([TechCrunch](https://techcrunch.com/2025/03/19/telegram-founder-pavel-durov-says-app-now-has-1b-users-calls-whatsapp-a-cheap-watered-down-imitation)), so for communities, creators and international customers it is a serious channel, not a side project.

## What you need

- A Telegram account on your phone or desktop.
- A Threadline account. It is free and needs no card. [Sign up here](/signup).
- Something to build the agent from: your website, an API or MCP server, or a one-sentence description of the business.

## Step 1: Build the agent (about 2 minutes, mostly waiting)

In Threadline, start a new bot. The wizard asks what you are starting from:

- **A website:** paste the URL and the builder reads your public pages, catalog, prices, policies and hours.
- **An API or MCP server:** each operation becomes a tool the agent can call.
- **Just an idea:** describe it ("a tutoring service that schedules sessions and sends practice questions") and Threadline generates mock data and tools so it works right away.

The build runs in the background and usually takes a minute or two. When it finishes you get a builder chat and a live phone preview where you can talk to the agent before anyone else does. Try your five most common customer questions now. If an answer is off, tell the builder in plain English what to change.

Optional but recommended: run the checks on the Deploy page. They test the agent on simulated customers, including typos, other languages and a prompt-injection attempt, and grade every reply against your own information. More on that in [how we test bots on simulated customers](/blog/testing-ai-chatbots-with-simulated-customers).

## Step 2: Create the bot with @BotFather (about 1 minute)

1. Open Telegram and search for **@BotFather**, the official bot for creating bots. Check for the blue verified tick.
2. Send `/newbot`.
3. Pick a **display name**. This is what customers see at the top of the chat, for example "Hayes Bakery".
4. Pick a **username**. It must be unique and end in "bot", for example `hayesbakery_bot`. This becomes your link: `t.me/hayesbakery_bot`.
5. BotFather replies with a **token**, a long string that looks like `123456789:AA...`. Copy it.

Treat the token like a password. Anyone who has it can control your bot.

While you are in BotFather, two optional touches make the bot feel finished: `/setdescription` sets the text people see before they press Start, and `/setuserpic` sets the bot's profile picture.

## Step 3: Paste the token into Threadline (about 30 seconds)

On your bot's Deploy page, find the Telegram card and press **Connect Telegram**. Paste the token.

Threadline checks it with Telegram straight away, using the Bot API's `getMe` call, so a typo or revoked token is caught immediately rather than failing silently later. If the token is valid, it is stored encrypted, the card shows your bot's `@username`, and you get an **Open in Telegram** link plus a QR code.

Then press **Deploy to customers**. That publishes the version you tested; customers always get exactly what you tested, and you can roll back to an earlier version at any time.

## Step 4: Say hello

Open `t.me/<your bot username>` and press **Start**. Your agent sends its greeting. Ask it something real. That is it: you have an AI agent on Telegram.

Share the link or the QR code wherever your customers are: your website, Instagram bio, a Telegram channel you run, a table card, the bottom of your newsletter.

## What the agent can do on Telegram

The Telegram bot is not a separate, simpler bot. It is the same agent that runs on iMessage, with the same brain, memory and data:

- **Answers from your information**, and says "I don't know" when the answer is not there instead of guessing.
- **Remembers customers** across conversations, so returning customers do not repeat themselves.
- **Fills tables** like Orders, Bookings or Leads from conversations, after confirming with the customer.
- **Calls your API or MCP tools** if you connected them, with every call logged.
- **Hands off to you** when something needs a human, with a summary.
- **Understands more than text.** Customers can send photos, files and locations, and the agent shows a typing indicator while it thinks.

Every chat appears in your Conversations view next to iMessage chats, and Stats shows what people ask about and what the agent could not answer.

## How it works under the hood

For the technically curious: Threadline's gateway uses Telegram's long polling (`getUpdates`) for each connected bot rather than a webhook. That means there is no public URL to configure, nothing to host, and no firewall rules. When you connect a token, Threadline removes any webhook previously set on that bot, because Telegram does not allow polling and a webhook at the same time. If you had the bot wired to another service by webhook, that service stops receiving updates.

The gateway respects Telegram's rate limits, retrying after the `retry_after` time Telegram returns, and refreshes the typing indicator every few seconds while the agent works on a longer reply. If you revoke or regenerate the token in BotFather, the card shows "Token stopped working" and asks for the new one.

If you want to build this yourself instead, our [Telegram AI agent guide](/telegram-ai-agent) covers the moving parts: updates, tools and safe access to your backend.

## Honest limits

- **Private chats only, for now.** The agent answers people who message it directly. Messages in groups are ignored.
- **One bot token, one agent.** If you run several businesses, create a bot in BotFather for each one.
- **Customers have to start the chat.** Telegram bots cannot message someone who has not pressed Start. That is a Telegram rule and a good one.
- **Telegram is not where everyone is.** In the US, most customers will be easier to reach on iMessage, and in India or Brazil, [WhatsApp](/whatsapp-ai-agent) is the default. The same agent runs on [iMessage](/imessage-api) today, and WhatsApp is next. Our [channel comparison](/blog/imessage-vs-sms-vs-whatsapp-vs-rcs) goes deeper.

## What it costs

Telegram's Bot API is free. On Threadline, Telegram is included in the Free plan, and you only start paying for usage beyond what is included, or at $29 a month on Pro for more included usage. There is no per-message fee from Telegram.

[Create your Telegram AI bot now](/signup). It is free to build and test, no card needed.

## Frequently asked questions

### Do I need to know how to code to make a Telegram AI bot?

No. You create the bot in Telegram with @BotFather, and Threadline builds the AI agent from your website, API or a description. You paste the token and press deploy.

### Is a Telegram bot free?

Telegram does not charge for bots or messages. Threadline's Free plan includes Telegram; beyond the included usage you pay for what you use, or move to Pro at $29 a month.

### Where do I find my Telegram bot token?

BotFather sends it when you create a bot with /newbot. If you lose it, open BotFather, send /mybots, choose your bot and open the API token option.

### Can my Telegram bot work in groups?

Not yet. Threadline's Telegram agent answers private chats. Group messages are ignored for now.

### Can the same agent answer on iMessage and WhatsApp?

Yes for iMessage, today. WhatsApp is next. The agent, its memory and its tables are shared across channels, so you do not maintain separate bots.

### Is my bot token safe?

Threadline validates the token with Telegram, stores it encrypted and never shows it in logs. If you think it leaked, regenerate it in BotFather and paste the new one.
