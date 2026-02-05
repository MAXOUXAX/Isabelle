## 2025-02-12 - Prevent Mass Mentions in AI Output
**Vulnerability:** The `safelySendMessage` utility, used for sending AI-generated "roasts", did not suppress Discord mentions. This allowed the AI (potentially via prompt injection) to trigger mass notifications (`@everyone`, `@here`) or harass specific users.
**Learning:** Utilities that wrap message sending must enforce secure defaults, especially when handling untrusted or generated content. Relying on the prompt to "behave" is insufficient.
**Prevention:** Enforce `allowedMentions: { parse: [] }` in all message sending utilities handling AI or user-controlled content.

## 2025-02-12 - Confused Deputy in Message History Fetching
**Vulnerability:** The `fetchLastUserMessages` utility used the bot's high-privilege permissions to read messages from channels that the invoking user could not access, potentially leaking private information via AI-generated content (Roast command).
**Learning:** Bots with broad permissions (like Administrator) must explicitly intersect their permissions with the invoking user's permissions when retrieving context or data on their behalf.
**Prevention:** Pass the `invokerId` to data fetching utilities and filter results based on `channel.permissionsFor(invoker)` to ensure the user is authorized to see the content.
