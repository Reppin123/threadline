---
title: "Why your customers would rather text you than use your app"
description: "Nobody wants another app. Customers already live in their messages. Why texting a business beats an app or a call, and what it means for small businesses."
slug: customers-would-rather-text-than-use-your-app
date: 2026-10-10
primary_keyword: "text a business instead of an app"
secondary_keywords: ["conversational commerce", "messaging vs mobile app", "customers prefer texting", "business texting", "ai agent for customer messaging"]
author: Aki
category: Opinion
---

Think about the last time you downloaded an app for a single business. A coffee shop, a salon, a gym, a local delivery service. You made an account, picked a password, allowed notifications, used it twice, and it has been sitting in a folder on page three ever since.

Now think about the last time you texted someone. Probably a few minutes ago.

That gap is the whole argument of this post. For most small and mid-sized businesses, the best "app" you can give customers is not an app at all. It is a thread in the messaging app they already have open all day. We built Threadline around that belief, so read this as an opinion with a stake in it. But we think the case stands on its own.

## The app tax nobody talks about

Building an app costs money. Getting people to install it costs more. Keeping it installed is the hard part.

The numbers are old but consistent. Sensor Tower found US smartphone users used about 46 different apps a month in the first half of 2021 ([Sensor Tower](https://sensortower.com/blog/apps-used-per-us-smartphone)), and a handful of those, messaging, maps, social, banking, take most of the time. AppsFlyer reported that 49% of Android apps were uninstalled within 30 days of download in 2022 ([AppsFlyer](https://www.appsflyer.com/resources/reports/app-uninstall-benchmarks-report/)). Your bakery's app is competing for a slot on that home screen with Instagram and the customer's bank.

Every app also comes with a list of chores for the customer:

- Find it in the App Store.
- Create an account, verify an email, choose a password they will forget.
- Learn a new interface for one business.
- Remember it exists the next time they need you.

For a business a customer deals with once a month, that is a lot to ask. Most people will not do it. They will call, or they will just go somewhere easier.

## Phone calls are not the answer either

The traditional alternative to an app is the phone. But calls have their own tax: they happen in business hours, they need both people free at the same moment, and they are terrible for anything with details, like an address, an order number or three options to choose between. A lot of people, especially younger customers, would simply rather not call.

Surveys from texting vendors have claimed for years that most consumers prefer texting a business to calling. Those numbers come from companies that sell texting, so take the exact percentages with salt. But you do not need a survey to know how you behave. When you have a quick question for a business, do you want to wait on hold, or do you want to send a text and get an answer while you do something else?

## Why texting wins

Texting is the one interface everyone already knows. No onboarding, no password, no update to install. And it fits how people actually live:

- **It is asynchronous.** The customer asks when it suits them and reads the answer when it suits them.
- **It keeps history.** The thread is a record: what they ordered, when the booking is, what you said about returns.
- **It is personal.** It sits next to messages from friends and family. A business in that list feels close.
- **It works for doing things, not just asking.** "Two croissants for 8am pickup" is a complete order in one message.

The landing page of our site says it in one line: nobody wants another app to download; they already have Messages open all day, so put your business there.

## What changed: the agent behind the thread

So why did every small business not move to texting years ago? Because someone had to answer the texts.

A text thread is only as good as the reply. If a person has to answer every message, texting does not scale past a few dozen customers, and it does not work at 11pm. Early chatbots tried to fix that with menus and keyword matching ("Reply 1 for hours, 2 for location") and mostly made people angry.

What changed is that language models can now hold a real conversation and, more importantly, do real work: look up an order, quote the correct price, take a booking, save the details, and know when to hand off to a human. The agent behind the thread can know your business as well as a good employee, answer in seconds and still say "I'm not sure, let me get someone" when it should.

That is the combination that makes the "no app" idea practical:

- **The customer gets** a thread in the app they already use, answered in seconds, any time.
- **The business gets** a 24/7 front desk that knows the menu, the prices and the policies, takes orders into a table you can see, and escalates the rest.

On our own benchmark, an agent built from a real tea store's website quoted every price correctly, took an order, remembered the customer a conversation later and replied in Hinglish when the customer switched languages, with a median reply time of 3.8 seconds. The [case study](/blog/ai-agent-for-dtc-store-sanitea) has the full transcript.

## "But apps can do more"

They can. If you are Uber or your bank, you need an app: maps, payments, complex flows, heavy daily use. We are not arguing that apps are dead.

We are arguing that most businesses are not Uber. A clinic needs bookings and reminders. A restaurant needs pre-orders. A store needs product questions, orders and order status. A gym needs class bookings and waitlists. Those are conversations. They were always conversations, and they got squeezed into apps and web forms because there was no other way to automate them.

And for businesses that do have an app, the thread is not a replacement, it is the front door. The agent can call the same backend your app uses, through an API or an MCP server, so a customer can check an order by text without opening anything.

## The honest trade-offs

Texting is not free of problems, and pretending otherwise would undercut the argument:

- **Channels are fragmented.** iPhone users in the US live in iMessage. Most of the rest of the world lives in WhatsApp. Communities live in Telegram. You need the same agent on several channels, which is why we built one agent that deploys to [iMessage](/imessage-api) and [Telegram](/telegram-ai-agent) today, with [WhatsApp](/whatsapp-ai-agent) next. Our [channel comparison](/blog/imessage-vs-sms-vs-whatsapp-vs-rcs) covers which to pick.
- **Trust has to be earned.** An agent that invents a refund policy destroys trust faster than a bad app. Test it on realistic customers before launch; [here is how we do it](/blog/testing-ai-chatbots-with-simulated-customers).
- **Consent matters.** A customer's messages are personal space. Only text people who asked you to, and make "stop" work instantly.
- **Some things need a screen.** Browsing 200 products is better on a website. The agent should link out when that is the better experience.

## What to do about it

If you run a small business, you do not need to commission an app to give customers a better way to reach you. Start with the thread:

1. List the five things customers most often contact you about.
2. Build an agent that handles those from your website or an idea. [It takes a couple of minutes](/blog/how-to-add-an-ai-agent-to-imessage).
3. Put it on the channel your customers already use, and share a link or QR code.
4. Read every conversation for the first two weeks. You will learn more about your customers than any app analytics dashboard has told you.

Your customers already have the app. It is called Messages.

[Put your business in their messages](/signup). Free to build and test, no card needed.

## Frequently asked questions

### Do customers really prefer texting a business to using an app?

For occasional interactions like bookings, orders and quick questions, most people would rather send a message than install and learn a new app. Texting needs no download, no account and no new interface.

### Is texting a replacement for my app?

Not always. Apps still make sense for heavy daily use and complex flows. For many small businesses, though, a texting agent covers what customers actually need, and for businesses with an app it can be a faster front door to the same backend.

### What can an AI agent do over text?

Answer questions from your own information, take orders and bookings into tables you control, call your API or MCP tools, remember returning customers and hand off to a human when needed.

### Which messaging app should my business use?

Use the one your customers already use with their friends: iMessage for many US iPhone users, WhatsApp across most of the world, Telegram for communities. The same agent can serve several channels.

### Won't customers be annoyed by a bot?

They are annoyed by bad bots: menus, keyword matching and wrong answers. A well-tested agent that answers correctly in seconds and hands off to a person when it should is usually faster than waiting for a human.
