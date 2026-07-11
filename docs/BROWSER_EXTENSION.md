# Browser Extension

`apps/browser-extension` contains a Manifest V3 local-checking client foundation.
It keeps the API URL constrained to loopback/private-network origins, supports
per-site exclusions, avoids password/payment/autocomplete-sensitive fields, and
guards replacements with stale-snapshot checks.

Verified on 2026-07-11:

```powershell
npm test
```

The safety suite passed six Node tests covering origin normalization, local URL
guards, exclusion matching, sensitive-field detection, API code-point to UTF-16
offset conversion, and stale replacement protection.

This is not a signed browser-store release. Real-site compatibility, extension
review, accessibility, and user support policies remain release work.
