# Data sources and licences

No HAT or WAT content is included. External data is only included after a
maintainer records a verifiable source URL, exact version, licence text,
commercial-use status, attribution requirement, modification/redistribution
conditions, and the files derived from it.

## Bundled language data

| Name | Source | Licence | Commercial use | Attribution | Notes |
| --- | --- | --- | --- | --- | --- |
| Skryfwys seed lexicon | Original project-authored entries in `data/dictionaries` | MIT, repository `LICENSE` | Yes | Copyright notice with redistributed software | Small functional seed, not an authoritative dictionary |
| Construction and quantity-surveying seed terminology | Original project-authored term records in `data/dictionaries` | MIT | Yes | Same as repository | Alternatives are preferences, not claimed dictionary definitions |
| Deterministic rule metadata/examples | Original project-authored rules in source/data | MIT | Yes | Same as repository | Conservative examples created for this project |
| Skryfwys evaluation suite | Original project-authored sentences in `data/evaluation` | MIT | Yes | Same as repository | May include artificial errors, each labelled by intended outcome |
| LibreOffice Afrikaans Hunspell dictionary | `github.com/LibreOffice/dictionaries`, `af_ZA`, pinned commit `da8a7e73fd26a134ad7c6438fa7c310730906b3a` | LGPL-2.1-or-later; licence text in `data/external/hunspell-af-za/COPYING.LESSER-2.1.txt` | Yes, with LGPL conditions | Preserve upstream notices in `README_af_ZA.txt`; credit Translate.org.za and credited authors | Bundled as replaceable `.dic`/`.aff` files; current adapter uses base forms as a spelling allow-list |

User-imported terminology is owned/licensed by the importing user and is never
redistributed as part of Skryfwys unless the owner separately authorises it.

## Software dependencies (not language datasets)

Exact installed versions are recorded in Python/npm lock or environment metadata.
Their package licences must be checked by dependency-audit tooling before a public
distribution. Primary runtime families used by this project are:

| Dependency | Source | Typical licence | Commercial use | Attribution |
| --- | --- | --- | --- | --- |
| Python | `python.org` / PSF | PSF | Yes | Licence notices apply |
| FastAPI | `github.com/fastapi/fastapi` | MIT | Yes | Copyright/licence notice |
| Pydantic | `github.com/pydantic/pydantic` | MIT | Yes | Copyright/licence notice |
| SQLAlchemy | `github.com/sqlalchemy/sqlalchemy` | MIT | Yes | Copyright/licence notice |
| Uvicorn | `github.com/encode/uvicorn` | BSD-3-Clause | Yes | Copyright/licence notice |
| React | `github.com/facebook/react` | MIT | Yes | Copyright/licence notice |
| Vite | `github.com/vitejs/vite` | MIT | Yes | Copyright/licence notice |
| TypeScript | `github.com/microsoft/TypeScript` | Apache-2.0 | Yes | Licence/NOTICE conditions |
| Vitest | `github.com/vitest-dev/vitest` | MIT | Yes | Copyright/licence notice |

This table is a review aid, not a substitute for inspecting the precise resolved
package graph and bundled licence notices at release time.

## Adapter candidates — not bundled

| Resource | Intended use | Status / action before use |
| --- | --- | --- |
| Hunspell affix expansion | Broader morphological coverage beyond base forms | Implement and evaluate affix-rule expansion while keeping `.dic`/`.aff` replaceable |
| LanguageTool Afrikaans | Additional grammar checks | Treat service/software and rule/data licences separately; pin a compatible version and measure false positives |
| HAT or WAT | Licensed definitions and lexical metadata | Requires a written commercial licence and provider adapter; never scrape or copy entries |
| Leipzig Corpora Collection Afrikaans | Frequency/context ranking | Prepared only; see `docs/LEIPZIG_FREQUENCY_SUPPLEMENT.md`; do not bundle raw corpus data until a pinned release, checksum, attribution text, denoising process, and evaluation slice are added |
| Transformer/embedding model | Optional context ranking or rewriting | Record model-card licence, training-data caveats, hosting terms, weights redistribution, and measured benefit |

## Adding a resource

1. Open a change containing the source URL, immutable version/hash, full licence,
   commercial-use conclusion, attribution text, and affected generated files.
2. Keep uncertain data outside the repository and expose only an adapter plus setup
   instructions until review is complete.
3. Add positive and negative evaluation slices, including code-switching and named
   terms, and publish the accuracy/latency change.
4. Ensure removal is possible without breaking the deterministic seed engine.
