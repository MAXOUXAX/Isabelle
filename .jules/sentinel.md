## 2025-02-12 - Prevent Mass Mentions in AI Output
**Vulnerability:** The `safelySendMessage` utility, used for sending AI-generated "roasts", did not suppress Discord mentions. This allowed the AI (potentially via prompt injection) to trigger mass notifications (`@everyone`, `@here`) or harass specific users.
**Learning:** Utilities that wrap message sending must enforce secure defaults, especially when handling untrusted or generated content. Relying on the prompt to "behave" is insufficient.
**Prevention:** Enforce `allowedMentions: { parse: [] }` in all message sending utilities handling AI or user-controlled content.


## 2025-02-12 - Fix Confused Deputy in Message Fetching
**Vulnerability:** The `fetchLastUserMessages` utility checked only the bot's permissions to access channels, not the invoking user's permissions. This allowed users to generate roasts using messages from private channels they could not access.
**Learning:** When a bot acts on behalf of a user, it must intersect its own high-level permissions with the user's permissions. Checking only "can I (the bot) see this?" is insufficient for privacy-sensitive operations.
**Prevention:** Always pass the `invokerId` (or member) to data-fetching utilities and verify `channel.permissionsFor(invoker).has(PermissionFlagsBits.ViewChannel)` before processing data.
