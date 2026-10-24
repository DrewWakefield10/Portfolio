# Contact.app email delivery

Contact.app keeps its existing two visible fields, CSS classes, scroll area and draggable window. Its React submit handler prevents navigation and uses `@emailjs/browser` to send directly to the configured EmailJS template. No mail client, API route, private credential or new UI framework is involved.

## Configuration

The supplied public identifiers are configured locally in `.env.local`, which is ignored by Git. `.env.example` lists the required names without account-specific values:

- `NEXT_PUBLIC_EMAILJS_SERVICE_ID`
- `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`
- `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY`

Restart the development server after changing them. For production, add the same supplied values under **Vercel → Project → Settings → Environment Variables**, selecting Production and any intended Preview/Development environments, then redeploy. Next.js embeds `NEXT_PUBLIC_` values at build time; these three identifiers are intentionally public. Never add a private EmailJS key, Gmail password, or OAuth token.

In the EmailJS dashboard, keep **To Email** fixed to `drew.wakefield.10@gmail.com`. The client supplies only `from_name` (`Portfolio Visitor`), `reply_to` (the visitor's email), and `message` (their message), so visitors cannot choose a recipient through this form. Set the template Reply-To to `{{reply_to}}`; use `{{message}}` with double braces so EmailJS escapes HTML. The account's remote template settings cannot be read or changed by the browser SDK.

Use EmailJS's origin allowlist for the actual portfolio production domain and only trusted preview/local-development origins. Check the account dashboard for available spam protections and quota usage. This integration does not claim those remote settings have been enabled. See the official [spam protection documentation](https://www.emailjs.com/docs/faq/does-emailjs-expose-my-account-to-spam/), [template escaping documentation](https://www.emailjs.com/docs/user-guide/dynamic-variables-templates/), and [SDK options](https://www.emailjs.com/docs/sdk/options/).

## Behavior

- Email is trimmed, required, format checked and limited to 254 characters. The trimmed message must contain 10–5,000 characters. Native email semantics, autocomplete and input length metadata are retained; accessible inline errors provide correction hints and focus the first invalid field.
- A hidden, non-focusable honeypot rejects populated submissions without consuming an EmailJS request.
- Sending disables Send and makes the fields temporarily read-only. A synchronous lock prevents duplicate submissions, including closing/reopening Contact.app while a request is pending.
- Fields clear only after provider acceptance. Failures keep their values and display `MESSAGE FAILED. PLEASE TRY AGAIN.` Provider errors and configuration values are never shown to visitors; missing configuration logs only a setup hint in development.
- A successful send starts a 30-second cooldown, retained across window reopen and page reload using only a local timestamp. SDK throttling additionally limits attempts to one per 10 seconds, including failed requests. Blocked application storage falls back to the in-memory successful-send cooldown.
- No automatic retries, message logging, message storage, changes to music/animation resources, or window navigation occur. Closing the window does not cancel a request already dispatched; reopening does not issue it again.

Client validation, honeypots, browser locks and timestamps are basic deterrents and can be bypassed. They are not secure server-side rate limiting; EmailJS account restrictions and provider protections still matter. A provider success confirms API acceptance, not Gmail inbox delivery. Browser/network failures can have an uncertain delivery outcome, so do not automatically retry.

## Verification

- `node --test tests/contact-message.test.cjs`: boundaries, whitespace, honeypot, exact variable mapping, concurrency, success cooldown, failure retry, missing configuration and blocked storage.
- `node tests/browser-contact.cjs`: real Chrome/SDK with a mocked EmailJS transport, covering validation, loading, duplicate blocking, failure preservation, success clearing, cooldown, navigation, desktop continuity and narrow-screen interaction. No messages are sent by this default test.
- `node tests/browser-contact.cjs http://localhost:3100 --live`: additionally dispatches **one** clearly identified controlled test through the actual provider. This intentionally consumes one send attempt. Check its reported API response and separately verify the received message in Gmail. Do not use live mode in automated CI.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm build` before deployment.

Implementation verification: production build, ESLint, TypeScript and all 60 tests in the contact/audio/music/local-time/fan/fish suites passed. Chrome checks passed for desktop and 390px mobile, both themes, touch/keyboard submission, pending/duplicate handling, provider failure/retry, success clearing, cooldown and uninterrupted desktop resources. These browser checks mock the EmailJS HTTP response while executing the installed SDK; they consume no email quota.

The controlled live-send command was rejected by automatic approval review with `blocked by policy`; no live request or Gmail inbox delivery was verified. The remote recipient, template escaping and origin allowlist still require dashboard verification. The supplementary strict UI audit reports the existing `scrollbar.webkit-only` finding in `app/globals.css:151`; this focused integration does not change that global styling.
