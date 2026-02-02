## 2026-02-02 - Cross-Channel Data Leakage via Confused Deputy
**Vulnerability:** The `roast` command allowed users to trigger an AI roast using a target's messages from *all* channels the bot could access, including private channels the invoking user could not see.
**Learning:** Bots with high privileges must act as the "confused deputy" and explicitly check if the invoking user has permission to access the data being processed.
**Prevention:** When processing data based on user input, always intersect the bot's permissions with the invoking user's permissions (e.g., `channel.permissionsFor(user).has(ViewChannel)`).
