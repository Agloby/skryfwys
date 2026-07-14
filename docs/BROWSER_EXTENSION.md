# Browser Extension

`apps/browser-extension` contains a Manifest V3 local-checking client foundation.
It keeps the API URL constrained to loopback/private-network origins, supports
per-site exclusions, avoids password/payment/autocomplete-sensitive fields, and
guards replacements with stale-snapshot checks.

Verified on 2026-07-14:

```powershell
node --test test/safety.test.cjs
```

The safety suite passed six Node tests covering origin normalization, local URL
guards, exclusion matching, sensitive-field detection, API code-point to UTF-16
offset conversion, and stale replacement protection.

The unpacked Chrome extension was also smoke-tested manually against a normal
web text field after fixing the floating bubble hit-testing overlay. The extension
folder used on this workstation is:

```text
G:\My Drive\Afrikaans AI Writing Assistant\apps\browser-extension
```

This is not a signed browser-store release. Chrome does not sync or permanently
install unpacked developer extensions the same way it handles Chrome Web Store
extensions; after profile changes, folder moves, or browser resets, reload it from
`chrome://extensions`.

Google Docs remains a special case: its document surface does not expose selected
text like a normal textarea, so use the full Skryfwys editor or copy/paste flow
until a dedicated Docs integration is built.
