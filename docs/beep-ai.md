# Mr. Beep: GPT chat

## Configuration

Set these **server-only** variables in `.env` locally and in the hosting environment:

```dotenv
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

An empty local placeholder has been added when the variable was absent. Existing
values are never replaced. Never use `NEXT_PUBLIC_OPENAI_API_KEY`. Restart/redeploy
the application after changing the environment. The model is configurable; its
availability and API billing depend on your OpenAI project. No API call was made
as part of implementation and no app, build, or tsc was run.

Open Mr. Beep → Ask Mr. Beep. The compact window starts with a single-line composer and grows with the dialogue.
The message area is capped at 420px; the entire window is capped at 560px and the
visible viewport. User messages align right, Beep replies left. There are no starter
questions, navigation links or tour replay button inside chat. The composer has no disclosure footer. The independent onboarding tour is unchanged.
Responses stream from OpenAI via server-sanitized NDJSON events. Text appears as
soon as the provider sends it; the initial network/model delay still exists. A small
cursor replaces Thinking. Beep moves his mouth while text arrives. Stop preserves
the received partial reply; retry replaces that partial reply without duplicating
the user message. Scrolling up suspends automatic following until near the bottom.

## Architecture

- `components/companion/BeepChat.tsx`: localized chat, loading/error/cancel/retry states.
- `components/companion/TomGuide.tsx`: popup conversation selection and controls;
  account-token changes clear its view and discard responses from the previous identity.
- `app/beep`: private conversation list and full-page continuation.
- `lib/beepConversations.ts`: account ownership, saved turns, revision/lease checks.
- `lib/beepChat.ts`: shared history bounds, user/assistant message types.
- `app/api/beep/chat/route.ts`: server-only OpenAI Responses API request via native fetch.
- `docs/beep-knowledge-base.md`: full website reference loaded on the server, cached
  per process. Redeploy/restart after changing it. Next's output tracing explicitly
  includes this file for the route in a packaged deployment.

The default model is GPT-4.1 mini. No SDK dependency, vector database
or external search service is required. See official OpenAI documentation:
[Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses),
[GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

## Scope and data

Beep can explain the website, talk casually, encourage the user and discuss work.
It can use the authenticated personal summary described below. It cannot perform
actions, fetch more account records, browse the web, or contact support.
Replies are plain text rendered through React, without HTML execution.

Requests contain the bounded conversation and the website reference, plus current
page path (no query string), interface language, mobile/desktop, and server-verified
registered/Pro flags. For registered accounts, `lib/beepPersonalContext.ts` also
provides a server-derived, bounded snapshot: name (60 characters), profile description
(240), joining date, XP, stored current/longest streak, last recorded activity, and
focus totals/completed/stopped counts/active days for today, the last 7 days, previous
7 days and last 30 days. The weekly difference is absolute focus minutes. The last
completed focus-session date and three recent finalized focus sessions are included;
task/project labels are capped at 80/60 characters. No full session history, email,
password, account ID, billing data or token is forwarded. The bearer token travels
only to our own route. All queries scope identity to the verified JWT, ignoring
client-supplied profile/statistics. Free-text profile and task labels are untrusted
prompt data. Personal statistics remain read-only; conversation persistence is described below.

The browser timezone is validated with Intl (UTC fallback). SQL groups by local
calendar days including today; periods use calendar boundaries, including DST. Only
finalized WORK/TIME_TRACKING records contribute. Effective minutes reuse the shared
SQL calculation, including stopped trackers. Breaks and ongoing sessions are excluded.
`lastRecordedActivityAt` is a presence observation, not necessarily the previous visit.
Unknown values remain null. Daily SQL aggregation returns at most 30 rows and the
model receives four compact totals, not those daily rows or 100 raw sessions.
The extra context is typically hundreds of tokens; text fields/record counts are
bounded, but exact token usage depends on content and the configured model.
Guests can also chat. Provider requests use `store: false`; this disables response
storage for retrieval, not every provider retention policy. Messages are still sent
to OpenAI. The chat has no visible provider disclosure, per the owner’s request.
Both authenticated and guest conversations are stored in the app database. Guests
send the existing `x-anonymous-id`; the first accepted message ensures an anonymous
account and saves its conversation/turns through the same persistence pipeline.
No transcript is written to localStorage. Reloading clears popup selection;
signed-in users can reopen saved chats at `/beep`. Guest chats are also visible
in the admin messages table. Previously unsaved guest messages cannot be recovered.
The latest eight saved turns, bounded to 16 whole messages / 12,000 characters,
are sent to the model. The popup displays up to 40 messages; the full page loads
30 turns at a time and can fetch all earlier messages. Questions are capped at 2,000 characters. Long conversations
therefore lose older context rather than promising permanent memory.

## Limits and deployment

Requests use a 40-second upstream timeout and a 45-second client timeout. Closing
the chat, changing accounts or Stop aborts the browser request; server cancellation
is propagated when the hosting platform delivers the disconnect. A provider may
already have processed/billed part of a cancelled request.

The route rejects cross-origin browser requests, invalid roles/system messages,
oversized bodies, and invalid bearer tokens. It validates account identity and Pro
on the server rather than trusting client claims. It never returns the provider's
raw error, key or internal prompt in API errors.

Basic rate limits are **per application process**: 5 requests/minute for a guest IP,
12 for an authenticated identity, one in-flight per identity, and 60 total/minute.
Expired buckets are pruned, with a bounded map size. Guests without an available IP
share a bucket. `x-forwarded-for` must be overwritten by a trusted hosting proxy;
it must not be accepted directly from arbitrary external clients. For multiple
instances/serverless scaling, enforce an additional shared edge/gateway quota and
OpenAI project spend limits: in-memory counters are not a global billing ceiling.
The server also checks Origin against the request origin; configure the reverse
proxy with the correct public host/protocol.

Successful requests return `application/x-ndjson` events containing `delta`,
`done`, or a sanitized `error`; upstream SSE events and metadata are never forwarded.
Timeouts and quotas remain active until the stream finishes or is cancelled.
Missing API key returns `not_configured` (503). Invalid/expired sign-in returns 401.
Local/provider throttling returns 429; transient failures keep a retry option.
If your OpenAI project cannot access the configured model, change `OPENAI_MODEL`
to a Responses-compatible text model available to that project.

## Verification

Targeted ESLint and whitespace/diff checks are the authorized implementation checks.
No live/billed API requests, server, build or typecheck are run. The existing strict
premium UI audit finding about native-select ownership in `/stats` is unrelated.

For the owner's manual run after adding the key: ask a website question, send a
casual message and a follow-up in another language; verify cancellation/retry,
missing/invalid key, 429, account switch during a request, reopening and reload,
mobile/keyboard/IME input, and the independent onboarding tour. Verify the packaged
server can read the knowledge file. Inspect actual replies for unsupported claims.

## Personal arrival message

The first greeting without valid account-bound welcome memory, recorded work
history or saved personal facts uses the shared local introduction in
`lib/beepIntroduction.ts`. The guest tour starts with the same English/Spanish
introduction. This introductory arrival does not call OpenAI or require an API
key; personalized greetings do. Clearing the browser cookie or using a new
browser does not force an introduction when the account already has work history.

GET `/api/beep/chat?language=en&timezone=Europe/Kyiv` verifies the bearer token,
queries fresh statistics and makes one Responses API request with `OPENAI_MODEL`,
`store: false` and at most 700 output tokens. It requests 2–3 short sentences,
targeting 320 characters with a 400-character hard display cap. The full website
reference is omitted from this small request. When available, greetings recall
one actual task/project and include one positive recorded-work total for yesterday,
the current calendar week (Monday onward), the current calendar month, or an
explicitly labeled last-7/30-day window. Periods use the user's timezone; calendar
month queries include its first day even on day 31. Existing rolling totals and
previous-week comparison remain available. The six latest work sessions supply
task names, not period totals; a completed session never implies a finished task.
A randomly selected available time period and the previous greeting encourage
variation; exact repetition is rejected. Without work history, a saved project
fact or a warm hello is used. No activity or zero totals are turned into criticism.
Greetings contain no advice, questions, productivity prompts or invitations
to take a next step.
Chat also avoids unsolicited coaching; advice is offered only when requested. Missing key,
provider failure, incomplete or repeated output suppress the optional welcome.
Generation costs API tokens; it is no longer a fixed local template.

The account-bound, signed HttpOnly SameSite=Lax cookie `pomo_beep_welcome_v1` keeps
only the last successful greeting and its timestamp for up to one year in this
browser. Its signing key is derived separately from JWT_SECRET so it cannot serve
as an authentication token. No profile or statistics are stored in the cookie.
A different account, invalid signature or cleared cookie has no previous greeting.
For gaps of at least three days, Beep may warmly say it has been a while since
talking and that he missed the user. This is time since the last greeting in this
browser, not verified absence from the website; active-session/presence updates
can already have overwritten lastSeenAt. No exact visit gap is invented, and
recent focus activity takes precedence over assumptions of inactivity.

On the homepage, TomGuide waits for completed auth, ready artwork, an idle timer,
visible tab and no modal before requesting a welcome.
Each account is greeted at most once per mounted visit, with no focus stealing.
Existing conversations suppress arrival messages. Close/Escape dismiss; clicking
the message seeds the chat with it and focuses input. The welcome automatically
dismisses 20 seconds after appearing; switching to chat cancels this timer and
never auto-closes the conversation. Identity/navigation changes abort requests
and discard stale results. Generation has a 30-second server timeout and a
35-second client timeout. Per-process limits allow five welcome requests per
identity per minute and share the global 60/minute model-request quota.

Validation: targeted ESLint and source/diff checks; mocked summary checks cover
period totals, previous-week comparison, completed/stopped distinction, profile
limits, identity scoping, anonymous exclusion and welcome context/cookie/generation behavior. No real database,
OpenAI, app launch, build or tsc calls were made for this change.

## Saved conversations

Administrators can read all persisted turns at `/admin#beep`, including full user
and assistant text, saved opening greetings, owner identity, turn/conversation IDs,
status, sequence, revision and Kyiv timestamps. The read-only
`POST /api/admin/beep-messages` uses `authorizeAdmin` before querying, never caches
responses, validates filters and paginates 50 turns at a time. Status and conversation
filters are available; a selected conversation is chronological, the global list
is newest first. Guest turns are included with their anonymous account identity.
Previously unsaved guest chats and provider usage metadata are unavailable.

Apply `20261101120000_add_beep_conversations` before using the new persistence
(`npm run prisma:migrate` applies pending repository migrations). Prisma Client
has been regenerated; migration files were prepared without connecting to a DB.
The migration adds only `beep_conversations` and `beep_turns`, with cascading owner
and conversation foreign keys. Existing pre-persistence messages cannot be
recovered from earlier page visits.

`/beep` lists the authenticated account's conversations, newest update first,
30 at a time with a timestamp/ID cursor. `/beep/[id]` loads a selected dialogue
and supports earlier messages, streaming replies, Stop and Retry. The index is
a full-width list; opening a row navigates to its separate dialogue page. There
is no sidebar, empty composer or chat-creation action on these pages.
Both routes are noindex. Access is through the companion history icon, personal
navigation or the compact navigation menu. The popup header has only history and close actions; its history icon always
opens the list at `/beep`. Closing/reopening keeps the current dialogue during
the mounted visit.
New chats are created when the first user message is accepted, named from that
message (100 characters). An opening welcome is stored with that new chat. New dialogues originate from
the companion popup; the page variant requires an existing loaded conversation.
Empty composers do not create records. No rename/delete actions were added.

GET `/api/beep/conversations` and GET `/api/beep/conversations/[id]` require a
verified token or a valid `x-anonymous-id` belonging to an existing anonymous account.
Every query is owner-scoped; a foreign ID
returns 404, not another account's data. Detail pagination uses `before` turn
sequence. API responses are no-store, request inputs are validated and cross-site
requests are rejected. Anonymous IDs cannot access registered accounts. Guest
retry/reload uses these endpoints; the full-page history UI still requires sign-in.

POST `/api/beep/chat` requires UUID-v4 `conversationId` and
`requestId` plus integer `revision`. It saves the user turn before generation and
reads model history from the database, ignoring browser-supplied assistant history
except a bounded first-chat welcome. Turn IDs deduplicate retried requests. A
completed request can replay its saved answer without another model call. Only
the latest unfinished turn can be regenerated; it retains its user message.
A database compare-and-set revision and 60-second lease serialize each dialogue
across processes/tabs. Stale writes fail; the user must reload conflicting state.

Streaming sends conversation metadata before deltas, checkpoints partial text at
most every 1.5 seconds and commits final state before the `done` event. Stop,
disconnect, provider failure or timeout preserve received partial text where the
platform allows finalization. Expired pending turns become recoverable interrupted
turns; abrupt process termination can lose text since the last checkpoint. A
save failure is shown explicitly, with Reload to inspect canonical state. There
is no promise that an in-flight response continues after leaving the page.

Validation for persistence: Prisma schema validation/client generation, targeted
ESLint and diff checks. Mocked transaction/API checks cover ownership, lease and
revision conflicts, checkpoints, stopped retries without duplicate user turns,
completed replay, isolated server-side context, stale-save rejection, auth and
pagination validation. No real DB/AI calls, migration deployment, app start, build
or tsc was run. Browser layout and interaction checks remain user-owned.

Saved-history pages participate in AppearanceProvider’s scenery routing. Their
list/dialogue panel uses the canonical appearance.css glass shell, shared pixel
tokens, blur and forced-colors fallback. No independent background or palette is
introduced. The default light/dark themes remain token-driven.

Automatic onboarding is limited to first-time guests after auth loading finishes.
Registered users skip onboarding even in a new browser, and signing in/registering
stops an active guest tour. Their personalized welcomes do not depend on the local
onboarding seen flag.

## Interaction logging

Button interactions are stored separately from dialogue in `beep_events`.
Onboarding records Next, Skip, Finish, Close/Escape and highlighted control presses,
with stable step numbers/names. Chat logging covers opening, welcome activation,
saved-history navigation, send (including Enter), retry, stop, reload and earlier
messages. Existing debug controls are instrumented while remaining hidden.

View `/admin#beep-events` (**Beep activity**), filter **Onboarding** to inspect the
tour, or click a visit ID to inspect one page session. Signed-in/anonymous accounts
are resolved on the server; unsigned guests are grouped by a temporary random visit
ID. No message bodies, form values or URL query strings are included in this log.
Collection is best-effort and never blocks the interface.

Deploy migration `20261101130000_add_beep_events` with `npm run prisma:migrate`
and regenerate Prisma Client with `npm exec -- prisma generate` when preparing the
deployment. Applying the migration is required for the event API and admin table.


## Cross-dialogue memory and language

Deploy `20261101140000_add_beep_memory_preferences` using `npm run prisma:migrate`
before running this version. `npm exec -- prisma generate` updates the client.
The migration is additive: private `beep_memory` and `beep_preferences` tables
reference users with cascading deletion; existing transcripts are unchanged.

Registered accounts now extract durable facts from each newly accepted user
message before generating the reply. `lib/beepMemory.ts` makes one additional,
server-only Responses request with strict JSON Schema, `store: false`, the current
message and existing memory (no whole-history scan). It uses OPENAI_MODEL and an
8-second timeout within the existing overall request budget and global quota.
This adds model latency and usage. Failure does not prevent the normal reply and
Beep receives the actual save result so it cannot promise an unconfirmed save.
This follows [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Up to 40 bounded facts/tombstones are retained, with at most eight changes per
message. Useful facts include a preferred name, occupation, ongoing project,
goals, interests and communication/work preferences. Exact supporting quotes from
the current user message are required. Assistant guesses, temporary feelings,
credentials, payment data, precise addresses and highly sensitive personal facts
are excluded by the extraction instructions. Memory is probabilistic extraction,
not a guarantee every statement is retained. Corrections replace stable keys;
explicit requests to forget remove a fact or clear all facts. Stored transcripts
are independent and are not erased by forgetting a remembered fact.

Account-scoped transaction locks and original user-turn timestamps prevent older
concurrent turns/retries from replacing newer facts or language. Completed replay
skips extraction. Memory is never returned in public profile/auth payloads or
written into browser storage. Anonymous/unsigned visitors have no durable personal
memory. Existing older dialogues are not automatically backfilled.

Response language priority: explicit request in the latest message → language of
that message → last clear user language in this dialogue for ambiguous text →
saved account language → interface locale. All languages are supported by the
prompt, independently of the English/Spanish UI. Russian → English → Ukrainian
must switch on the very next reply; an older saved language never locks the chat.
Language is extracted and persisted on the first clear message and included in
future dialogues and arrival greetings.

## Account companion preferences

`CompanionPersistence` owns live synchronization, independently of the renderer or
mobile breakpoint. GET/PATCH `/api/beep/preferences` verifies account ownership,
rejects invalid/cross-site inputs and stores visibility, wandering, animation and
normalized home x/y separately from timer settings. Partial updates preserve
unrelated fields. On first use without server preferences, existing local settings
seed the account. Afterwards server values restore on a different browser/device.
Guests retain local preferences; account caches and pending patches use scoped
keys. Writes serialize, preserve changes made during initial loading, and retry on
window focus/network restoration. Pending writes survive reload; failed sync is
shown on Settings. Account changes cancel requests and reset the preference scope.

Manual checks (application launch/build/typecheck remain user-owned):
- Introduce a durable goal/name; start another dialogue and ask Beep about it.
- Correct a fact, ask to forget it, and then ask in a fresh dialogue.
- Switch Russian → English → Ukrainian within one chat and after reloading.
- Send an emoji after a language switch; verify the saved language is retained.
- Switch accounts and confirm facts/preferences never come from the previous one.
- Hide in chat, restore in Settings, disable wandering/animation, change position;
  reload or use another device and verify the account preferences return.
- Disconnect while changing preferences, restore connection/focus, and verify retry.

Implementation verification: Prisma schema validation/client generation and
targeted ESLint. No DB migration deployment, actual AI calls, tests, app launch,
build or tsc were run.
