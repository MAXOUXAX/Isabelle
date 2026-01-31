## 2025-02-20 - Unsafe Date Parsing
**Vulnerability:** The application requested dates in `DD/MM/YYYY HH:MM` format but used `new Date()` directly, which fails or behaves unpredictably with this format in Node.js, leading to potential crashes or invalid data.
**Learning:** Node.js/JS `Date` constructor is not robust for non-standard formats. Input validation for dates must be strict and match the user prompt.
**Prevention:** Always use a custom parser or a library like `date-fns` (or `Intl`) for specific formats, and valid input before passing to constructors/APIs.
