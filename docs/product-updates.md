# Illustrated product updates

The first prepared release is `workspace-appearance-2026-11`. It describes all nine
site themes (three free, six Pro), timer font scaling, Pixel preview alignment and
wider Terminal digits. Pomo blogs leads the modal with localized directory/project
screenshots and links to `/projects/public` and `/projects/public/new`.
Blog PNGs in `public/updates/` are screenshots of the running application, captured
in English and Spanish with sample data: the catalog uses browser-intercepted mock
responses, and the project uses the existing `/projects/demo` preview. No real user
data is included. The floating feedback widget and its prompt are hidden only during
capture. The theme and font SVGs remain illustrations.

## Preview and delivery

1. Apply the checked-in migration with `npm run prisma:migrate` and regenerate the
   Prisma client with `npm exec prisma generate` before deploying this change.
   These commands have not been run as part of preparing the feature.
2. Open `/admin#updates` and choose **Preview update**. Preview never sends a
   notification or marks an existing notification read; it also works before
   delivery status can load. The dialog follows the active English/Spanish locale.
3. Review the recipient count, choose **Send notification**, then confirm the named
   release. Only registered, non-anonymous accounts present at send time receive it.
   Sending is not automatic on deployment or on page visits.
4. Users receive an ordinary in-app inbox notification through the existing
   notification refresh cycle (on load and the five-minute refresh). There is no
   email, browser push, or automatic modal opening. Clicking the notification opens
   the illustrated dialog. It can be reopened from notification history.

No notifications have been sent by preparing this implementation. Delivery is an
explicit admin action protected by the existing server `authorizeAdmin` policy.
Publishing inserts notifications in one atomic SQL statement. The unique
`(userId, productUpdateId)` constraint and `ON CONFLICT DO NOTHING` make concurrent
requests and retries safe. A later send can reach newly registered accounts without
notifying existing recipients again. A timeout does not prove failure: refresh the
delivery count before retrying.

## Add a future release

- Add a stable, unique ID to `PRODUCT_UPDATES` in `lib/productUpdates.ts`.
- Supply English/Spanish title, summary, section text, bullet points and image alt
  text. Images are optional per section; use local image paths with reserved 2:1
  geometry. Do not add arbitrary HTML or external embeds.
- Add assets under `public/updates/` and preview both languages and a narrow screen.
- Deploy the catalog and assets before sending. Keep published entries and IDs so
  old notifications continue to open the correct release. Create a new ID for a new
  release instead of overwriting a previously sent announcement.
- The admin section lists catalog entries automatically; no new database migration
  is needed for each release. Titles/bodies in storage provide a fallback; supported
  clients render localized catalog copy in the inbox and history.

## Ownership and manual checks

`CommunityDialog` owns native focus containment, Escape/close and focus return.
`ProductUpdateProvider` listens only for explicit `open-product-update` events. It
renders the content immediately, marks the owner-scoped notification read with the
existing PATCH API, and keeps content open with a retry message on network failure.
Changing accounts hides the previous account's dialog and cancels its read request.
Unknown release IDs display an unavailable message without marking them read.

Before sending, manually check preview, keyboard scrolling and close/focus return,
mobile layout, both locales, all relevant site themes, and missing-image behavior.
Verify that opening the inbox alone leaves update notifications unread, clicking
one marks it read, and history can reopen it. Simulate failed marking and retry,
logout/account changes, unauthorized publication, duplicate sends and a timed-out
send. Schema/client generation, runtime tests, build and typecheck were not run
while preparing this change.
