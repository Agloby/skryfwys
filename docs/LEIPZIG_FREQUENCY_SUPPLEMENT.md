# Leipzig frequency supplement plan

Option C is reserved for a frequency supplement derived from the Leipzig Corpora
Collection Afrikaans downloads. It should improve suggestion ranking, not act as
the primary spelling dictionary.

## Source and licence checkpoint

- Source: <https://wortschatz-leipzig.de/en/download/Afrikaans>
- Likely data type: sentence corpus and word-frequency data
- Licence status from review: CC BY for downloadable corpus files, with
  attribution required
- Important caution: automated queries and commercial web-interface use have
  separate restrictions; use downloadable files only unless written permission is
  obtained

## Why it is not bundled yet

The Leipzig data is corpus-derived, not a curated spelling dictionary. A raw
wordlist can contain misspellings, foreign words, markup artefacts, names, and
web-crawl noise. Bundling it directly as "correct words" would make Skryfwys less
trustworthy.

## Safe integration path

1. Download a pinned Leipzig Afrikaans corpus release manually.
2. Record the exact URL, download date, file names, checksum, and CC BY
   attribution text in `docs/DATA_SOURCES_AND_LICENCES.md`.
3. Generate a frequency table, not an allow-list:

   ```text
   word<TAB>frequency
   dokument<TAB>12345
   ```

4. Filter aggressively:
   - keep Afrikaans alphabetic tokens only;
   - remove URLs, emails, numbers, markup, and one-off noise;
   - keep names out unless explicitly intended as named-entity support;
   - never override the curated spelling dictionary with corpus-only words.
5. Use the table only to rank suggestions that are already plausible according
   to Skryfwys seed/custom data or a verified dictionary adapter.
6. Add an evaluation slice showing whether ranking improves without increasing
   false positives.

## Current status

Prepared, not active. No Leipzig corpus data is bundled in this repository.
