import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Languages,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  XCircle,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { lookupWord } from "../api";
import { lookupWordLocally } from "../lib/demoEngine";
import type { WordLookupResponse } from "../types";
import { EmptyState, PageIntro } from "./Shell";

interface WordHelperPageProps {
  onUseWord: (word: string) => void;
}

function WordChips({ title, values, onUse }: { title: string; values: string[]; onUse?: (word: string) => void }) {
  if (!values.length) return null;
  return (
    <div className="word-group">
      <h4>{title}</h4>
      <div className="word-chips">
        {values.map((word) => <button type="button" key={word} onClick={() => onUse?.(word)}>{word}{onUse && <ArrowRight size={13} />}</button>)}
      </div>
    </div>
  );
}

export function WordHelperPage({ onUseWord }: WordHelperPageProps) {
  const [word, setWord] = useState("hoeveelheidsopmeter");
  const [result, setResult] = useState<WordLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = word.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await lookupWord(clean));
      setDemo(false);
    } catch {
      setResult(lookupWordLocally(clean));
      setDemo(true);
      setError("Die API is nie bereikbaar nie. Slegs die ingeboude, beperkte taalriglyne word gewys.");
    } finally {
      setLoading(false);
    }
  }

  const status = result?.spelling_status ?? (result?.found ? "correct" : "unknown");

  return (
    <div className="word-helper-page page-stack">
      <PageIntro eyebrow="Woord vir woord" title="Vind die regte woord" description="Kontroleer spelling en verken sinonieme, registerkeuses, samestellings en verwante vakterme." />

      <section className="word-search-card card">
        <form onSubmit={submit} role="search">
          <label htmlFor="word-search">Watter woord wil jy naslaan?</label>
          <div className="search-field">
            <Search size={20} aria-hidden="true" />
            <input id="word-search" value={word} onChange={(event) => setWord(event.target.value)} placeholder="bv. hoeveelheidsopmeter" autoComplete="off" />
            <button className="primary-button" type="submit" disabled={loading || !word.trim()}>{loading ? <LoaderCircle className="spin" size={18} /> : <Search size={18} />}Soek woord</button>
          </div>
          <p className="field-hint">Probeer ook: <button type="button" onClick={() => setWord("mooi")}>mooi</button>, <button type="button" onClick={() => setWord("vinnig")}>vinnig</button> of <button type="button" onClick={() => setWord("kosteberaming")}>kosteberaming</button>.</p>
        </form>
      </section>

      {error && <div className="inline-banner demo-banner" role="status"><ShieldCheck size={18} /><span>{error}</span></div>}

      {result ? (
        <section className="word-result card" aria-live="polite">
          <div className="word-result-header">
            <div className={`word-status-icon ${status}`}>
              {status === "correct" ? <CheckCircle2 /> : status === "incorrect" ? <XCircle /> : <CircleHelp />}
            </div>
            <div>
              <span className="page-eyebrow">{status === "correct" ? "Spelling aanvaar" : status === "incorrect" ? "Moontlike spelfout" : "Nie in die beperkte bron gevind nie"}</span>
              <h2>{result.word}</h2>
              {result.part_of_speech && <span className="part-of-speech">{result.part_of_speech}</span>}
            </div>
            {demo && <span className="source-badge demo">Blaaierdemo</span>}
          </div>

          {result.meaning ? (
            <div className="meaning-block authorised">
              <div className="meaning-label"><BookOpen size={17} /><strong>Betekenis</strong></div>
              <p>{result.meaning}</p>
              <small>Bron: {result.meaning_source ?? result.source_attribution ?? "gemagtigde leksikale bron"}</small>
            </div>
          ) : result.generated_guidance ? (
            <div className="meaning-block guidance">
              <div className="meaning-label"><Sparkles size={17} /><strong>Taalriglyn — nie ’n woordeboekdefinisie nie</strong></div>
              <p>{result.generated_guidance}</p>
            </div>
          ) : (
            <div className="meaning-block unavailable">
              <div className="meaning-label"><ShieldCheck size={17} /><strong>Geen gemagtigde definisie beskikbaar nie</strong></div>
              <p>Skryfwys sal nie ’n woordeboekdefinisie uitdink nie. Ander taalhulp hieronder kan steeds beskikbaar wees.</p>
            </div>
          )}

          <div className="word-groups-grid">
            <WordChips title="Spelvoorstelle" values={result.suggestions} onUse={onUseWord} />
            <WordChips title="Sinonieme" values={result.synonyms} onUse={onUseWord} />
            <WordChips title="Antonieme" values={result.antonyms} />
            <WordChips title="Formele alternatiewe" values={result.formal_alternatives} onUse={onUseWord} />
            <WordChips title="Informele alternatiewe" values={result.informal_alternatives} onUse={onUseWord} />
            <WordChips title="Samestellings" values={result.compounds} onUse={onUseWord} />
            <WordChips title="Verwante terme" values={result.related_terms} onUse={onUseWord} />
          </div>

          {result.examples.length > 0 && <div className="examples-block"><h4><Languages size={17} />Voorbeeldsinne</h4>{result.examples.map((example) => <blockquote key={example}>{example}</blockquote>)}</div>}
          {result.source_attribution && <footer className="result-source"><Tags size={15} /> Bron: {result.source_attribution}</footer>}
        </section>
      ) : (
        <section className="card"><EmptyState icon={<BookOpen />} title="’n Woord in konteks">Soek ’n woord om betroubare, bronbewuste taalhulp te sien.</EmptyState></section>
      )}
    </div>
  );
}
