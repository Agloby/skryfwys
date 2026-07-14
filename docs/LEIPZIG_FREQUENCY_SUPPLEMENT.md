# Leipzig frequency supplement

Option C is implemented as a conservative frequency supplement derived from the
Leipzig Corpora Collection Afrikaans downloads. It improves suggestion ranking;
it does not act as the primary spelling dictionary.

## Source and licence checkpoint

- Source: <https://downloads.wortschatz-leipzig.de/corpora/afr_wikipedia_2021_10K.tar.gz>
- Corpus: `afr_wikipedia_2021_10K`
- SHA-256: `2B05298E0257592F89CC6F9EAA8BA5F97ED05B4C4DF910D0DB529621D9471859`
- Data type: Leipzig sentence corpus with precomputed word counts
- Licence status from Wortschatz Leipzig terms: downloadable text corpora are
  CC BY; attribution required
- Important caution: general project data/applications and web-interface usage
  have additional restrictions. Skryfwys uses the downloadable archive, not
  automated web queries.

## Why it is ranking-only

The Leipzig data is corpus-derived, not a curated spelling dictionary. A raw
wordlist can contain misspellings, foreign words, markup artefacts, names, and
web-crawl noise. Bundling it directly as "correct words" would make Skryfwys less
trustworthy.

## Implemented processing

The processing script generates a frequency table, not an allow-list:

```text
word<TAB>frequency
dokument<TAB>12345
```

Filters:

- keep alphabetic/apostrophe/hyphen tokens only;
- require minimum frequency 2;
- keep only words already accepted by Skryfwys seed data or the verified
  Hunspell adapter;
- never override the curated spelling dictionary with corpus-only words.

Current generated output:

- `data/derived/leipzig_afrikaans_frequencies.tsv`
- 5,229 frequency entries
