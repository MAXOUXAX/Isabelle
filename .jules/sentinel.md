## 2025-02-12 - Prevent Mass Mentions in AI Output
**Vulnerability:** The `safelySendMessage` utility, used for sending AI-generated "roasts", did not suppress Discord mentions. This allowed the AI (potentially via prompt injection) to trigger mass notifications (`@everyone`, `@here`) or harass specific users.
**Learning:** Utilities that wrap message sending must enforce secure defaults, especially when handling untrusted or generated content. Relying on the prompt to "behave" is insufficient.
**Prevention:** Enforce `allowedMentions: { parse: [] }` in all message sending utilities handling AI or user-controlled content.

## 2025-02-12 - Safe Extraction from External Data Sources (ICS)
**Vulnerability:** The `node-ical` library can return properties as objects (`{ val: string, params: ... }`) instead of strings, causing runtime crashes (DoS) when methods like `.replaceAll()` are called on them without validation.
**Learning:** External libraries may have complex return types that differ from assumptions or incomplete TypeScript definitions.
**Prevention:** Always use a helper function to validate and extract primitives (strings, numbers) from external data sources before processing them.
