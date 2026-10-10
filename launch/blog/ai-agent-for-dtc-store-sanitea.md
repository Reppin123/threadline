---
title: "An AI shopping assistant for a DTC store, built from its website"
description: "We pointed Threadline at a real tea store's website. The agent priced everything right, took an order and passed 11 of 11 checks, with a 3.8s median reply."
slug: ai-agent-for-dtc-store-sanitea
date: 2026-10-10
primary_keyword: "ai shopping assistant for dtc store"
secondary_keywords: ["ai chatbot for shopify store", "ai sales agent for ecommerce", "conversational commerce", "text to order", "imessage shopping assistant"]
author: Aki
category: Case study
---

Most "AI for e-commerce" demos are built on a store the vendor made up. We wanted to know what happens when you point an agent builder at a real direct-to-consumer store, with real prices, real shipping rules and real edge cases, and then let it talk to customers who type badly, switch languages and change their minds.

So we used Sanitea, a small Indian tea brand selling whole-leaf teas from the Kangra Valley through its own site at sanitea.vercel.app. It is our standing benchmark. This post walks through what the agent learned, how it handled real questions, where it failed, and what that means if you run a DTC store on Shopify, WooCommerce or your own stack.

To be clear about the relationship: Sanitea is a public website we test against, not a paying customer, and every number below comes from our own test runs.

## What we gave it: one URL

The input was just the store's URL. Threadline's builder crawled the public site, respecting robots.txt, following the sitemap and reading structured data. On Shopify and WooCommerce stores it reads the catalog straight from the store's own product JSON, which is the most reliable way to get exact prices and variants. Sanitea is a custom storefront, so the builder read the product and policy pages directly.

The build took 99 seconds and produced:

- **32 documents and 62 knowledge chunks** from the site's pages.
- **9 catalog items with prices and sizes**: Strong Masala Chai, Shaam Mastani, Kangra Valley Green Tea, Hibiscus Green Tea, Kangra Orthodox Black, Kashmiri Kahwa, Sanitea Iced Tea, The Kangra Trio Gift Box and The Chai Ritual Set.
- **Key facts** pulled from the policy pages: free shipping on orders above ₹999, a flat ₹79 below that, a ₹49 cash-on-delivery handling fee, packing within 24 hours on working days, and 3 to 5 day delivery to metros.
- **An Orders table**, created by default for shops, so the agent can take orders in chat.
- **Tools** to search the knowledge base, save and update rows, remember customer facts, schedule messages and hand off to a human.

Nobody wrote an FAQ by hand. Nobody uploaded a spreadsheet.

## The conversation: what a customer actually experiences

Here is a condensed version of a real test conversation over iMessage. Replies arrive as short bubbles, the way a person texts.

**Customer:** hi! what teas do you sell and how much are they?

**Agent:** The full list with sizes and prices, for example Strong Masala Chai at ₹249 for 100 g or ₹499 for 250 g, and Kashmiri Kahwa at ₹449 for a 50 g jar. Then it offers to help pick: strong, light, fruity or spiced?

**Customer:** what can i buy for diwali gifting?

**Agent:** The two real gift sets with prices and contents: the Kangra Trio Gift Box at ₹999 and the Chai Ritual Set at ₹549. It mentions that gifts can be shipped straight to the recipient and that bulk and corporate orders go to the brand's email.

**Customer:** what are your shipping charges and can I return an opened pack?

**Agent:** Free above ₹999, ₹79 below, ₹49 extra for cash on delivery. Opened packs cannot be returned because tea is a food product, but damaged or wrong items reported within 48 hours with a photo are replaced or refunded.

Every one of those facts matches the store's own policy pages.

### Taking an order

The customer then ordered two 100 g packs of Strong Masala Chai with a Bengaluru address. The agent did the arithmetic (2 × ₹249 = ₹498, plus ₹79 shipping because it is under ₹999, total ₹577), read the order back, and asked for confirmation before saving anything. On "yes", it saved a row to the Orders table with item, size, quantity, amount, payment method, name, phone, address and pincode.

It also did something we did not script. The store issues order numbers starting with "SAN", and the agent had no way to generate one. Instead of inventing a number, it saved the order, told the customer it did not have the order number yet, and handed off to the team to send it. That is exactly the behavior you want.

### Coming back later

In a second conversation seven hours later, as a new thread, the same customer asked "do you remember my name?" The agent did, because it had saved the name with its memory tool the first time. Then the customer switched to Hinglish: "kya aapke paas koi iced tea hai?" The agent answered in Hinglish with the correct iced tea pack, price and flavours.

### Saying "I don't know"

Finally the customer asked about a shop in Tokyo and wholesale pricing for 500 kg. Neither is on the website. The agent said it had no information on shipping outside India or wholesale rates, pointed to the published bulk-enquiry email and offered to pass the question on. No invented store, no made-up price.

## The numbers

Across that end-to-end run, the agent met **11 of 11 expectations**, covering correct catalog and prices, a real gift recommendation, brewing tips grounded in the site, correct shipping and returns, an order saved to the table, customer facts remembered, memory across conversations, a correct Hinglish reply, and an honest "don't know". Median reply time was **3.8 seconds** on Claude Sonnet.

Latency varies run to run. In a later run with a larger test suite, the median was 5.7 seconds, and the slowest turn, the one that saved an order, remembered three facts and handed off to a human, took 17.6 seconds. Those are honest numbers for an agent that is actually doing work rather than just generating text.

We also ran Threadline's checks: 14 test questions written from the site plus 12 simulated customers. The agent passed **25 of 26 (96%)**.

## The one failure, and why it matters

The failing case was a "gift shopper" persona looking for a Diwali gift under ₹500. The agent recommended the Kashmiri Kahwa correctly, then, when asked whether the jar comes gift-wrapped, it could not find that detail, became over-cautious and walked back an ingredient list that was actually correct. The judge failed it for retracting true information.

That is a useful kind of failure. It is not a hallucination; it is the agent being too careful. And it shows why grading matters: without a judge comparing every reply to the store's own pages, you would never notice. We cover how the checks work in [how we test bots on simulated customers](/blog/testing-ai-chatbots-with-simulated-customers).

## What this means for your store

If you run a DTC brand, here is what transfers to your store:

- **Your website is already the training data.** If prices, sizes, shipping and returns are on your site, the agent can quote them exactly. If they are not, it will say so, and the questions it could not answer show up in your Stats. That list is also a to-do list for your website.
- **Shopify and WooCommerce stores get the catalog straight from product JSON**, which means variants and prices come from your store data, not from a model's reading of the page.
- **Ordering in chat works without a new checkout.** The agent records orders in a table you can see and export. Payments still go through your own checkout; the agent never takes card details in chat.
- **Language is not a problem.** Customers write the way they talk. Hinglish, typos and one-word replies were all handled in testing.
- **Handoff keeps you in control.** Anything the agent cannot do lands with you, with a summary.

The channel is where your customers already are: iMessage for iPhone users today, [Telegram](/telegram-ai-agent) for communities and international buyers, and [WhatsApp](/whatsapp-ai-agent) next, which matters a lot for Indian brands like Sanitea. If you want the full channel trade-off, read our [iMessage vs SMS vs WhatsApp vs RCS comparison](/blog/imessage-vs-sms-vs-whatsapp-vs-rcs), and for the iMessage side specifically, see [what "iMessage API" actually means](/imessage-api).

## Try it on your own store

The fastest test is the one we ran: paste your store URL, wait a couple of minutes, and ask the agent your ten most common customer questions in the preview. Then run the checks and read the transcripts.

[Build an agent from your store's website](/signup). Free to build and test, no card needed.

## Frequently asked questions

### Does it work with Shopify stores?

Yes. On Shopify and WooCommerce stores, Threadline reads the catalog from the store's own product JSON, so prices and variants are exact. It also reads your policy and FAQ pages for shipping, returns and other details.

### Can the agent take payments?

Not in chat. The agent records orders in a table you control, and payment happens through your existing checkout. It never asks for card details in the conversation.

### What if my prices change?

The agent's knowledge comes from your site, so rebuild or recrawl after a price change and the agent quotes the new prices. Every deploy is a version you can roll back.

### Was Sanitea a paying customer?

No. Sanitea's public website is the benchmark we test our builder against. All numbers in this post come from our own test runs.

### How fast does it reply?

In our benchmark run the median reply was 3.8 seconds. Turns that save an order or call several tools take longer; the slowest turn we measured in a later run was 17.6 seconds.

### Does it work in languages other than English?

Yes. In testing it replied correctly in Hinglish, Hindi written in Latin script, matching the customer's style.
