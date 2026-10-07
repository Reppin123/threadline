> ## Documentation Index
> Fetch the complete documentation index at: https://docs.photon.codes/docs/llms.txt
> Use this file to discover all available pages before exploring further.

> ## Agent Instructions
> Use Stable documentation by default. Honor an explicit Beta request or a URL under /docs/beta/. If the requested version conflicts with the installed CLI package or API origin, clarify the target before writing integration code.
> Pages under /docs/beta/ document Beta; other product pages document Stable. Keep the CLI package, commands, API origin, and credentials within the selected version. State the documentation version in your answer.
> For MCP search, always pass version: Stable or version: Beta. Unfiltered search mixes both versions. For filesystem reads, keep Beta queries under /beta/ and exclude /beta/ from Stable queries; discover paths before reading them.
> The public docs base is https://photon.codes/docs. Convert MCP page paths to public URLs under that base, preserving /beta/ when present. Read https://photon.codes/docs/skill.md for version selection and https://photon.codes/docs/llms.txt for the version indexes.

# Stable documentation index

> Read Stable Photon pages, schemas, and section exports.

Documentation version: **Stable**. Use only this version's contracts.

Use Stable by default. Honor an explicit version request or versioned URL; never combine contracts from different versions.

Use Stable documentation by default. Honor an explicit Beta request or a URL under /docs/beta/. If the requested version conflicts with the installed CLI package or API origin, clarify the target before writing integration code.

Pages under /docs/beta/ document Beta; other product pages document Stable. Keep the CLI package, commands, API origin, and credentials within the selected version. State the documentation version in your answer.

For MCP search, always pass version: Stable or version: Beta. Unfiltered search mixes both versions. For filesystem reads, keep Beta queries under /beta/ and exclude /beta/ from Stable queries; discover paths before reading them.

The public docs base is [https://photon.codes/docs](https://photon.codes/docs). Convert MCP page paths to public URLs under that base, preserving /beta/ when present. Read [https://photon.codes/docs/skill.md](https://photon.codes/docs/skill.md) for version selection and [https://photon.codes/docs/llms.txt](https://photon.codes/docs/llms.txt) for the version indexes.

## Spectrum

[Stable Spectrum content (JSON)](https://photon.codes/docs/agent-context/stable/spectrum.json)

### Get started

* [Introduction](https://photon.codes/docs/spectrum-ts/introduction.md): Spectrum brings your agents to the interfaces millions already use.
* [Getting Started](https://photon.codes/docs/spectrum-ts/getting-started.md): Install spectrum-ts and send your first message across platforms

### Core concepts

* [Messages](https://photon.codes/docs/spectrum-ts/messages.md): Receive, narrow, and act on incoming messages
* [Spaces and Users](https://photon.codes/docs/spectrum-ts/spaces-and-users.md): Send messages, manage typing indicators, and resolve participants
* [Reactions and Replies](https://photon.codes/docs/spectrum-ts/reactions-and-replies.md): React to incoming messages and send threaded replies
* [Platform Narrowing](https://photon.codes/docs/spectrum-ts/platform-narrowing.md): Recover platform-specific types and actions from unified Spectrum primitives
* [Webhooks](https://photon.codes/docs/spectrum-ts/webhooks.md): Receive messages via HTTP instead of a long-lived process

### Content

* [Content](https://photon.codes/docs/spectrum-ts/content.md): Build every outbound message shape with Spectrum content builders.
* [Text](https://photon.codes/docs/spectrum-ts/content/text.md): Send plain text and stream text through Spectrum.
* [Markdown](https://photon.codes/docs/spectrum-ts/content/markdown.md): Send styled text that renders through each provider's native formatting model.
* [Attachments](https://photon.codes/docs/spectrum-ts/content/attachments.md): Send files from paths, URLs, or buffers with stable attachment IDs.
* [Voice](https://photon.codes/docs/spectrum-ts/content/voice.md): Send voice notes with audio metadata and provider fallbacks.
* [Contacts](https://photon.codes/docs/spectrum-ts/content/contacts.md): Share contact cards from structured data, users, or vCards.
* [Rich links](https://photon.codes/docs/spectrum-ts/content/rich-links.md): Let each platform render a URL with its native rich-link preview.
* [App](https://photon.codes/docs/spectrum-ts/content/app.md): Send and update a tappable app card, with optional live rendering on supported platforms.
* [Polls](https://photon.codes/docs/spectrum-ts/content/polls.md): Send poll prompts and receive selected options as content.
* [Groups](https://photon.codes/docs/spectrum-ts/content/groups.md): Bundle multiple messages into one logical visual group.
* [Custom content](https://photon.codes/docs/spectrum-ts/content/custom.md): Send provider-specific structured payloads.
* [Replies](https://photon.codes/docs/spectrum-ts/content/replies.md): Thread content under an existing message.
* [Edits](https://photon.codes/docs/spectrum-ts/content/edits.md): Rewrite previously sent outbound messages.
* [Unsend](https://photon.codes/docs/spectrum-ts/content/unsend.md): Retract a previously sent outbound message.
* [Read](https://photon.codes/docs/spectrum-ts/content/read.md): Mark a conversation as read, and observe when a recipient reads what you sent.
* [Typing indicators](https://photon.codes/docs/spectrum-ts/content/typing-indicators.md): Send start and stop typing signals.
* [Rename](https://photon.codes/docs/spectrum-ts/content/rename.md): Rename chats through the content pipeline.
* [Avatar](https://photon.codes/docs/spectrum-ts/content/avatar.md): Set or clear group chat avatars.
* [Membership](https://photon.codes/docs/spectrum-ts/content/membership.md): Add or remove group members and leave chats through the content pipeline.
* [Composing content](https://photon.codes/docs/spectrum-ts/content/composing-content.md): Send multiple content items or reply with multiple parts.

### Providers

* [Providers](https://photon.codes/docs/spectrum-ts/providers.md): Choose, configure, and combine Spectrum platform providers.

#### Voice

* [Outbound calls](https://photon.codes/docs/spectrum-ts/providers/voice/outbound-calls.md): Configure a SIP application to place calls through a Spectrum iMessage line.
* [Inbound calls](https://photon.codes/docs/spectrum-ts/providers/voice/inbound-calls.md): Register an inbound route and receive calls from a Spectrum iMessage line.
* [Voice call troubleshooting](https://photon.codes/docs/spectrum-ts/providers/voice/troubleshooting.md): Common audio problems on Spectrum voice calls, what causes them, and how to fix them.

#### iMessage

* [iMessage connection and routing](https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing.md): Configure cloud or local iMessage packages, lines, spaces, and per-phone routing.
* [iMessage messaging features](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features.md): Explore each iMessage messaging feature in its own guide.
* [iMessage message effects](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/message-effects.md): Send iMessage bubble and screen effects with text, markdown, or attachments.
* [iMessage chat renaming](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/chat-renaming.md): Rename an iMessage group chat.
* [iMessage group avatars](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/group-avatars.md): Set, clear, and retrieve iMessage group chat icons.
* [iMessage group membership](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/group-membership.md): Add, remove, list, and leave members of an iMessage group chat.
* [Inbound iMessage group events](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/inbound-group-events.md): Handle iMessage membership and group metadata changes from other participants.
* [Inbound iMessage read receipts](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/inbound-read-receipts.md): Observe when iMessage recipients read messages sent by your agent.
* [iMessage chat backgrounds](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/chat-backgrounds.md): Set or clear an iMessage conversation background image.
* [iMessage Apps](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/apps.md): Send and update customized iMessage App cards.
* [Native iMessage contact card sharing](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/contact-card-sharing.md): Share the bot account's own iMessage contact card in a chat.
* [Native iMessage message metadata](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/message-metadata.md): Read curated Apple delivery, formatting, attachment, and reaction fields.
* [Fetching iMessage attachments](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/fetching-attachments.md): Retrieve cloud iMessage attachments directly by GUID.
* [iMessage tapback reactions](https://photon.codes/docs/spectrum-ts/providers/imessage/messaging-features/tapback-reactions.md): Map Spectrum emoji aliases to native iMessage tapbacks.

#### Terminal

* [Terminal setup and usage](https://photon.codes/docs/spectrum-ts/providers/terminal/setup-and-usage.md): Start the terminal provider, configure slash commands, and work with multiple spaces.
* [Terminal interactions](https://photon.codes/docs/spectrum-ts/providers/terminal/interactions.md): Use reactions, replies, attachments, inline images, typing indicators, and console capture in the terminal provider.

#### WhatsApp Business

* [WhatsApp Business setup](https://photon.codes/docs/spectrum-ts/providers/whatsapp-business/setup.md): Configure the WhatsApp Business provider with Meta credentials.
* [WhatsApp Business conversations](https://photon.codes/docs/spectrum-ts/providers/whatsapp-business/conversations.md): Resolve WhatsApp users and start supported 1:1 conversations.

#### Telegram

* [Telegram setup](https://photon.codes/docs/spectrum-ts/providers/telegram/setup.md): Configure the Telegram provider and webhook registration.
* [Telegram conversations and features](https://photon.codes/docs/spectrum-ts/providers/telegram/conversations-and-features.md): Start Telegram conversations and review supported provider features.

### Advanced

* [Custom Events and Lifecycle](https://photon.codes/docs/spectrum-ts/custom-events-and-lifecycle.md): Platform-specific event streams and graceful shutdown
* [Building a Custom Platform](https://photon.codes/docs/spectrum-ts/custom-platforms.md): Use definePlatform to plug a new messaging platform into Spectrum

### Integrations

* [Chat SDK](https://photon.codes/docs/integrations/chat-sdk.md): Add iMessage to a Chat SDK bot with the iMessage adapter
* [eve](https://photon.codes/docs/integrations/eve.md): Connect an eve agent to iMessage through Photon

### Best Practices

* [Architecture](https://photon.codes/docs/best-practices/architecture.md): Patterns for building human-feeling agents on Spectrum
* [Inbound pipeline](https://photon.codes/docs/best-practices/inbound-pipeline.md): Debouncing message bursts, batching, and surviving cancellation without dropping messages.
* [Recovery and state](https://photon.codes/docs/best-practices/recovery-and-state.md): Idempotent retries, per-resource memory scope, and a durable failure audit log.
* [iMessage deliverability](https://photon.codes/docs/best-practices/imessage-deliverability.md): Designing messaging flows that don't get a line flagged by Apple's filtering.

### Troubleshooting

* [iMessage troubleshooting](https://photon.codes/docs/spectrum-ts/troubleshooting/imessage.md): Common iMessage problems on Spectrum, what they mean, and how to fix them.

## CLI

[Stable CLI content (JSON)](https://photon.codes/docs/agent-context/stable/cli.json)

### Getting Started

* [Photon CLI](https://photon.codes/docs/cli/overview.md): Bring your agents to any interface — manage projects, Spectrum, billing, and your profile from the terminal
* [Installation](https://photon.codes/docs/cli/installation.md): Install the Photon CLI via npm, or as a standalone binary
* [Authentication](https://photon.codes/docs/cli/authentication.md): Log in, manage tokens, work with multiple backends, and authenticate in CI

### Commands

* [Projects](https://photon.codes/docs/cli/projects.md): Create, manage, and configure Photon projects from the CLI
* [Spectrum](https://photon.codes/docs/cli/spectrum.md): Manage Spectrum profiles, users, lines, platforms, and avatars from the CLI
* [Billing](https://photon.codes/docs/cli/billing.md): View plans, manage subscriptions, and open Stripe portals from the CLI
* [Profile & utilities](https://photon.codes/docs/cli/profile-and-utilities.md): Manage your developer profile and use diagnostic commands

## Webhooks

[Stable Webhooks content (JSON)](https://photon.codes/docs/agent-context/stable/webhooks.json)

### Getting Started

* [Webhooks](https://photon.codes/docs/webhooks/overview.md): Receive messaging events at your own URL — Spectrum signs each delivery so you know it's real
* [Quickstart](https://photon.codes/docs/webhooks/quickstart.md): Register a URL, verify the signature, receive your first event in five minutes
* [Events](https://photon.codes/docs/webhooks/events.md): The exact wire format Spectrum sends — headers, body, and what each field contains

### Implementation

* [Verifying signatures](https://photon.codes/docs/webhooks/verifying-signatures.md): Confirm each delivery is genuine, unmodified, and recent — copy-paste verifier code for Node, Bun, Python, and Go
* [Delivery and retries](https://photon.codes/docs/webhooks/delivery.md): How Spectrum decides when to retry, when to give up, and what your endpoint should return
* [Managing webhooks](https://photon.codes/docs/webhooks/managing-webhooks.md): Register, list, delete, and rotate webhook signing secrets via the Spectrum API
* [Troubleshooting](https://photon.codes/docs/webhooks/troubleshooting.md): Common webhook problems, what they mean, and how to fix them

## Low-level SDKs

[Stable Low-level SDKs content (JSON)](https://photon.codes/docs/agent-context/stable/low-level-sdks.json)

### Advanced Kits

#### iMessage

* [Getting Started](https://photon.codes/docs/advanced-kits/imessage/getting-started.md): Install the Advanced iMessage SDK, connect to a server, and send your first iMessage
* [Messages](https://photon.codes/docs/advanced-kits/imessage/messages.md): Send, reply, react, edit, list, and subscribe to iMessage events
* [Chats](https://photon.codes/docs/advanced-kits/imessage/chats.md): Create chats, read chat state, mark read, set typing, share contact cards, and manage chat backgrounds
* [Groups](https://photon.codes/docs/advanced-kits/imessage/groups.md): Rename groups, manage participants, set group icons, leave groups, and subscribe to group events
* [Attachments](https://photon.codes/docs/advanced-kits/imessage/attachments.md): Upload files, inspect metadata, and stream attachment downloads
* [Polls](https://photon.codes/docs/advanced-kits/imessage/polls.md): Create polls, read state, vote, unvote, add options, and subscribe to poll events
* [Addresses](https://photon.codes/docs/advanced-kits/imessage/addresses.md): Check whether an email address or phone number can be used with iMessage
* [Locations](https://photon.codes/docs/advanced-kits/imessage/locations.md): Request, list, fetch, and watch shared Find My friend locations
* [Events](https://photon.codes/docs/advanced-kits/imessage/events.md): Recover missed events after disconnects and consume SDK streams
* [Error Handling](https://photon.codes/docs/advanced-kits/imessage/error-handling.md): Handle SDK error classes, error codes, retries, and idempotent writes

#### WhatsApp Business

* [Getting Started](https://photon.codes/docs/advanced-kits/whatsapp/getting-started.md): Connect the WhatsApp Business SDK and send your first message
* [Messages](https://photon.codes/docs/advanced-kits/whatsapp/messages.md): Send text, media, location, contacts, and reactions
* [Interactive Messages](https://photon.codes/docs/advanced-kits/whatsapp/interactive-messages.md): Buttons, lists, product messages, and flows
* [Templates](https://photon.codes/docs/advanced-kits/whatsapp/templates.md): Send pre-approved message templates with typed parameters
* [Events](https://photon.codes/docs/advanced-kits/whatsapp/events.md): Subscribe to inbound messages and status updates with resumable cursors
* [Media](https://photon.codes/docs/advanced-kits/whatsapp/media.md): Upload, fetch, and delete images, video, audio, and documents
* [Error Handling](https://photon.codes/docs/advanced-kits/whatsapp/error-handling.md): Catch typed errors and classify with error.code

#### Legacy

* [iMessage (Legacy)](https://photon.codes/docs/legacy/imessage.md): Documentation for the legacy @photon-ai/advanced-imessage-kit SDK

### Opensource Kits

* [imessage-kit](https://photon.codes/docs/opensource/imessage-kit.md): Open-source, type-safe iMessage SDK for macOS — send, query, watch, and automate

### Utilities

* [heif2jpeg](https://photon.codes/docs/utilities/heif2jpeg.md): Fast and simple HEIC/HEIF to JPEG converter for Node.js

## API reference

[Stable API reference content (JSON)](https://photon.codes/docs/agent-context/stable/api-reference.json)

### Getting Started

* [Introduction](https://photon.codes/docs/api-reference/introduction.md): Manage Spectrum projects, webhooks, and platform configuration over HTTPS.
* [OAuth](https://photon.codes/docs/api-reference/oauth.md): Build apps that act on behalf of a Photon user with OAuth 2.1 and OpenID Connect.
* [Rate limit](https://photon.codes/docs/api-reference/rate-limit.md): Default request limits for the Spectrum API.

### Dashboard API

* [Dashboard API (OpenAPI)](https://photon.codes/docs/api-reference/dashboard-openapi.json)

### Spectrum API

* [Spectrum API (OpenAPI)](https://spectrum.photon.codes/openapi/json)


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.