# Flow logged-in app — captured live from Aki's account on 2026-10-07 (accessibility read). Recreate this IA; our own words/visuals.

## Top bar (all app pages)
"Your bots" link · bot switcher popup (current bot name) · trial meter button ("4% of trial used") · Settings · Log out · "New bot" (primary) ·
in Build: "Review and deploy" primary button top-right.

## /dashboard — "Your bots"
- Heading "Your bots"; right: "$0.06 of $1.50 trial credit used, $1.44 left. At this rate it lasts about 162 more days."
- Grid of bot cards. Each card: name, status pill (NOT LIVE / LIVE), sub "Not on a channel yet" (or channels it's on),
  sparkline "Chats per day · 14 days … Today", three stats: THIS WEEK n chats · THIS MONTH $x spent · SCHEDULED n (none coming),
  footer "No problems" (or problem count) + "Open".
- Bottom card: "Make another bot — Answer a few questions and Flow writes the first version for you." [New bot]

## New bot — "Start a bot" (/bots/new) — conversational wizard
- Assistant bubble: "Hey — I'm Flow. Tell me what you've got and I'll ask a few questions. What are we starting from?"
- "Pick a starting point" chips: Just an idea · Existing website or app · An MCP server · Some APIs ;
  "or describe your bot · then a few short questions". Textarea "Your answer" + Attach a file + Send.
- Footer: "Your answers become the bot's first draft. You can change anything after." · "Ask about a paid pilot".
- Follow-up questions are generated, multi-select chips. Real example answers sent to the builder:
  "Build my bot from these answers: - Starting from: Existing website or app - What's the website or app…: https://sanitea.vercel.app/
   - Who will chat with the…: My customers, My team - What should the Sanitea bot…: Track orders, Take orders, Recommend teas,
   Share brewing tips, Manage team tasks - For taking and tracking orders,…: Just a website"

## Bot workspace — left nav: Build · Data · Conversations · Versions · Stats · (bottom) Settings

### Build (3-pane)
- Left pane "EDIT — Tell the builder what to change": builder chat transcript (first user msg = wizard answers; builder replies
  "I set up the Sanitea assistant to recommend teas, share brewing tips, take and track orders on your site, and manage team tasks.")
  Suggestion chips (generated): "Update payment policies" · "Send personalized offers" · "Ask for feedback after reminders".
  Textarea "Describe a change, like 'ask about allergies first'" · Attach a file · New chat · "Enter to send · Shift+Enter for a new line" · Send.
- Right pane: live phone preview. "Preview as" radio: Telegram | WhatsApp (we add iMessage, default). Bot name (click to rename),
  status "Starting the bot". "Web access off" toggle · Clear. Chat bubbles (e.g. "what can i buy for diwali gifting" → product w/ price,
  coupon WELCOME10). Composer: attach photo/file · "Message your bot" · Share a location · Record a voice note · Send.

### Review and deploy
- "Nothing to deploy: your latest version (v1) is the current one. Connect a channel so customers can reach it."  [Back to Build] [Deploy to customers →]
- Status block: NOT LIVE · "Customers can't reach your bot yet" · channel cards Telegram (Not set up, Connect Telegram) · WhatsApp (Connect WhatsApp).
  NOTE: Flow's dashboard has NO iMessage connect yet → our iMessage-first deploy is the differentiator.
- "Current version: v1 · 1079267. It goes live on the channel you connect."
- "What changed" diff between versions (commit ids).
- "Checks" (Not run yet) [Run the checks]: "Flow calls each tool you changed once on your draft, then plays each of your test questions,
  and its own checks, on the live version and on your draft, and a judge grades both. It takes a minute or two."
- "Changed your mind after deploying? Every version stays in Versions, and you can roll back to one from there."

### Data — sub-tabs: Saved data · Tables · Scheduled · Customers ; "Search everything" + "Export all"
- Stat tiles: THINGS SAVED (None this week) · CUSTOMERS (with saved data) · SCHEDULED (Nothing scheduled)
- "What your bot keeps": table cards, each with name, description, saves in last 7 days, column headers, and who fills it:
  Orders (Amount, Quantity, Status, Tea, Placed at) — "The bot fills it from chats";
  Team tasks (Done, Owner, Task, Due) — "You fill it, the bot reads it".
- "Want the bot to keep something else? Ask in Build: 'keep a list of orders with name, phone and items'. The builder sets it up;
  your bot can't make tables on its own." [Go to Build]

### Conversations
- Search chats; filter chips: All n · Couldn't answer n · Problems n; channel checkboxes.
- Empty: "No customer chats yet — When customers write to your bot … their chats show here. Your chats in Test aren't listed here." [Connect …]
- Footer: "Customers are told their chats are kept for 90 days and seen by the bot's owner. Chats older than that are deleted."

### Versions
- "Each version customers got is listed here, newest first, with how its checks went. Open one to see where it is live, or to go back to it."
- Row: v1 · CURRENT · from Flow · date · commit id · description · "Current version, not on any channel yet" · [See changes].

### Stats
- Header: bot name; "Not on … yet" [Connect a channel].
- WHAT IT CAN DO: Web access Off · Languages English · Voice notes "Hears them".
- Tiles: CHATS THIS WEEK · CUSTOMERS · ANSWERED ON ITS OWN (% of replies checked) · ACCOUNT CREDIT LEFT ($1.44, ~162 days at this rate).
- "Chats per day — Last 14 days · per channel" stacked bar chart.
- "Spend this month": Answering customers · Changes in Build · Voice notes and files.
- "Questions it couldn't answer — This week · grouped by topic".  "Needs attention — Nothing needs you."

### Settings (modal)
- Your bots list (Open now / Open) + New bot · Name + Rename · "Delete this bot… — Customers can no longer reach it: its channels and scheduled messages stop."
- Plan: "Free trial: 4% used." "Need your bots on isolated servers, or higher limits?" [Ask about a paid pilot]
- API: "Let your own systems send customers check-ins, schedule follow-ups, and read customers, chats and tables."
  Create key (name optional, [ ] Only this bot, [ ] Can read customer notes). Example:
  curl -X POST https://flow.engineer/api/v1/bots/69/messages -H "Authorization: Bearer $KEY" -H "Idempotency-Key: order-1042-ready"
       -d '{"to": "telegram:123456789", "prompt": "Tell them order 1042 is ready for pickup"}'   (bot writes the message itself)

## Business model observed
- $1.50 free trial credit, usage metered in $ (answering customers, build changes, voice/files). Paid pilot for isolated servers.
