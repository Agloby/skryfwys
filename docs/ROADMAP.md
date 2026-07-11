# Roadmap

## Next five recommended tasks

1. **Independent language data review:** select a precisely versioned open or
   licensed Afrikaans lexicon, document its commercial redistribution terms, add it
   through an adapter, and measure the change on a separately reviewed corpus.
2. **Expand conservative language coverage:** add morphology/compound ranking and
   high-signal Afrikaans rules only with positive, negative, code-switching, and
   offset fixtures; commission native-language review of messages and examples.
3. **Complete identity and data rights:** implement Argon2id accounts, secure
   server-side sessions/CSRF, ownership isolation, migrations, and end-to-end
   export/delete tests before exposing a multi-user public service.
4. **Target-platform release testing:** package the Manifest V3 client, sideload the
   Word add-in over HTTPS, compile/sign the iOS Share Extension in Xcode, and run
   privacy/accessibility matrices on real hosts before store submission.
5. **Production operations:** add PostgreSQL migrations, shared throttling,
   metadata-only metrics, restore drills, dependency/secret scanning, SBOM and
   signed image/release provenance.

## Later research

- Contextual candidate reranking whose measured top-1 gain justifies its privacy,
  latency, licence, and maintenance cost.
- Afrikaans morphology and compound segmentation using a verifiably licensed
  corpus rather than ad-hoc word lists.
- Offline/on-device models with acceptable package size and battery impact.
- Outlook compose support reusing the Office API client after Word range handling
  is proven.
- A custom iOS keyboard only after a separate privacy threat model, local lexicon
  benchmark, secure-field/device tests, and App Store policy review.

Accuracy targets will be set from an independent labelled set; the project will not
use “Grammarly-level” as an unmeasured milestone.
