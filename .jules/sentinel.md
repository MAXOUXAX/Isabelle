## 2025-02-12 - Prevent Mass Mentions in AI Output
**Vulnerability:** The `safelySendMessage` utility, used for sending AI-generated "roasts", did not suppress Discord mentions. This allowed the AI (potentially via prompt injection) to trigger mass notifications (`@everyone`, `@here`) or harass specific users.
**Learning:** Utilities that wrap message sending must enforce secure defaults, especially when handling untrusted or generated content. Relying on the prompt to "behave" is insufficient.
**Prevention:** Enforce `allowedMentions: { parse: [] }` in all message sending utilities handling AI or user-controlled content.

## 2026-02-09 - Prevent Mass Mentions in Automatic Responses
**Vulnerability:** The `automaticResponseMessageListener` directly replied with content from the database without suppressing mentions. If a malicious user (or compromised database) configured a response with `@everyone`, it would trigger a mass mention.
**Learning:** Database content should be treated as untrusted when it comes to mentions, just like user input or AI output.
**Prevention:** Explicitly set `allowedMentions: { parse: [] }` when replying with content from the database.
