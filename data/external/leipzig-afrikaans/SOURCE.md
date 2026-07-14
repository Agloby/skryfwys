# Leipzig Afrikaans corpus source record

This directory contains the downloaded Leipzig Corpora Collection source used to
derive a conservative ranking-frequency table for Skryfwys.

## Source

- Corpus: `afr_wikipedia_2021_10K`
- Upstream archive URL:
  <https://downloads.wortschatz-leipzig.de/corpora/afr_wikipedia_2021_10K.tar.gz>
- Download date: 2026-07-14
- SHA-256:
  `2B05298E0257592F89CC6F9EAA8BA5F97ED05B4C4DF910D0DB529621D9471859`
- Derived file:
  `data/derived/leipzig_afrikaans_frequencies.tsv`

The Hugging Face `imvladikon/leipzig_corpora_collection` metadata confirms that
individual corpora are served from the original Leipzig download server rather
than re-hosted.

## Licence and terms

Wortschatz Leipzig's terms distinguish general project data/applications from
downloadable text corpora. The terms page states that downloadable text corpora
are made available under Creative Commons Attribution (CC BY). Attribution is
therefore required for redistribution and public use.

Attribution/citation requested by Leipzig:

> Dirk Goldhahn, Thomas Eckart and Uwe Quasthoff: Building Large Monolingual
> Dictionaries at the Leipzig Corpora Collection: From 100 to 200 Languages. In
> Proceedings of the Eighth International Conference on Language Resources and
> Evaluation (LREC'12), 2012.

## Skryfwys use

The raw corpus is not used as a spelling allow-list. The generated table keeps
only tokens that are already accepted by the original Skryfwys seed lexicon or
the verified LibreOffice Hunspell adapter. It is used only as a ranking signal
for suggestions.

Regenerate with:

```powershell
python scripts\build_leipzig_frequencies.py `
  --source data\external\leipzig-afrikaans\afr_wikipedia_2021_10K\afr_wikipedia_2021_10K-words.txt `
  --target data\derived\leipzig_afrikaans_frequencies.tsv `
  --minimum-frequency 2
```
