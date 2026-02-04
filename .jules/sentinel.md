## 2025-02-12 - Prevent Mass Mentions in AI Output
**Vulnerability:** The `safelySendMessage` utility, used for sending AI-generated "roasts", did not suppress Discord mentions. This allowed the AI (potentially via prompt injection) to trigger mass notifications (`@everyone`, `@here`) or harass specific users.
**Learning:** Utilities that wrap message sending must enforce secure defaults, especially when handling untrusted or generated content. Relying on the prompt to "behave" is insufficient.
**Prevention:** Enforce `allowedMentions: { parse: [] }` in all message sending utilities handling AI or user-controlled content.

## 2025-02-12 - Prevent Mass Mentions in Database-Driven Responses
**Vulnerability:** Automatic responses loaded from the database were replied directly to messages without suppressing mentions. If a response contained `@everyone` or `@here`, it would trigger a mass notification.
**Learning:** Even if data comes from a database (which might be considered "trusted" if only admins edit it), it's best practice to sanitize or restrict its capabilities when sending it to Discord to prevent accidental or malicious mass pings.
**Prevention:** Always use `allowedMentions: { parse: [] }` when sending content that isn't hardcoded or strictly validated, especially for automated replies.
