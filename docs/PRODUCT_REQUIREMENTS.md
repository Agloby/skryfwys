# Product requirements

## Product intent

Skryfwys helps Afrikaans writers find spelling, grammar, punctuation, terminology,
and clarity problems without requiring an external AI service. It is designed for
private correspondence and professional material, including construction and
quantity-surveying text. The product must be honest about the limited coverage of
its original seed lexicon and deterministic rules.

## Users and jobs

| User | Primary job | Required outcome |
| --- | --- | --- |
| General Afrikaans writer | Check and improve a passage | Explainable issues with safe, applicable suggestions |
| Professional writer | Enforce preferred terminology and formality | Personal terms and terminology alternatives are respected |
| Privacy-sensitive user | Check text without third-party processing | A visible local/private mode and no raw-text persistence |
| Developer/integrator | Reuse checking in another client | Versioned typed HTTP contracts and stable Unicode offsets |

## First-release capabilities

1. Check pasted Afrikaans text for known spelling mistakes and a conservative set
   of grammar, punctuation, style, terminology, and clarity issues.
2. Return stable issue IDs, Python string offsets, confidence values, rule IDs,
   bilingual messages, and ranked suggestion provenance.
3. Apply or ignore one issue, apply only safe non-overlapping corrections in bulk,
   undo/redo edits, and add a token to a personal dictionary.
4. Rewrite in at least four modes without an AI provider; preserve URLs, email
   addresses, quoted text, dates, measurements, names where identifiable, and
   amounts. Material transformations must be described.
5. Look up a selected word without inventing an authorised dictionary definition.
6. Expose local, private-server, and explicit cloud-AI privacy modes. Core checking
   always remains available without cloud AI.
7. Import/export user terminology in JSON and CSV through a documented contract.
8. Run locally through FastAPI plus a responsive installable web application.

## Quality and safety requirements

- The normal deterministic check path targets less than 500 ms for a paragraph on
  a typical development machine.
- All offsets must slice back to the exact `original` string, including decomposed
  and precomposed Afrikaans characters.
- Suggestions below the safe threshold are never applied by bulk correction.
- Submitted text is neither logged nor stored by default.
- External AI processing is disabled until a user deliberately selects cloud-AI
  mode and the server has a configured provider.
- Request size, rate, timeout, and structured-response limits are enforced at the
  API boundary.
- No HAT or WAT content, or any resource with an unverified redistribution
  licence, is bundled.
- Keyboard-only operation, labelled controls, visible focus, non-colour status
  cues, 200% zoom, reduced motion, and mobile touch targets are first-class UI
  acceptance criteria.

## Release acceptance scenarios

- `Die kontrakteur het die werk vol tooi.` identifies the accidental split and
  offers `voltooi` at the correct span.
- `Ons sal dit nie more kan voltooi nie.` identifies `more` and offers `môre`
  without damaging the surrounding `nie ... nie` construction.
- `Die hoeveelheidsopmeter het die kosteberaming hersien.` is accepted when the
  built-in construction terminology collection is enabled.
- A newly added personal term is accepted on the next request and survives an API
  restart when persistent storage is configured.
- A correction can be applied and undone in the editor.
- Local mode performs no model-gateway call; cloud-AI mode is visibly distinct and
  cannot be enabled silently.
- The same check contract is consumable by the browser and Office clients.

## Explicitly deferred from the production claim

- Broad dictionary or corpus coverage comparable with commercial products.
- Full syntactic Afrikaans grammar analysis and authoritative lexical definitions.
- Production signing/distribution of browser, Office, Windows, or iOS clients.
- iOS compilation on non-macOS hosts and claims of unrestricted system-wide
  keyboard access.
- Multi-tenant enterprise identity, billing, and horizontally scaled rate limiting.

These items may have working foundations in the repository, but remain deferred
until their platform-specific and accuracy acceptance tests pass.
