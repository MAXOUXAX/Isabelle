## 2025-02-12 - Prevent Mass Mentions in AI Output
**Vulnerability:** The `safelySendMessage` utility, used for sending AI-generated "roasts", did not suppress Discord mentions. This allowed the AI (potentially via prompt injection) to trigger mass notifications (`@everyone`, `@here`) or harass specific users.
**Learning:** Utilities that wrap message sending must enforce secure defaults, especially when handling untrusted or generated content. Relying on the prompt to "behave" is insufficient.
**Prevention:** Enforce `allowedMentions: { parse: [] }` in all message sending utilities handling AI or user-controlled content.

## 2025-02-12 - Confused Deputy via Bot Permissions
**Vulnerability:** The `roast` command fetched messages using only the bot's permissions, allowing users to access message content from channels they cannot see (e.g., admin channels) by targeting a user who posted there.
**Learning:** When a bot acts on behalf of a user to retrieve data, it must intersect its own permissions with the invoker's permissions to prevent authorization bypass.
**Prevention:** Verify `channel.permissionsFor(invoker).has(ViewChannel)` before accessing channel data in user-initiated commands.
