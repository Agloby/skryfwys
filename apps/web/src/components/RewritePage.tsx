import {
  ArrowRight,
  BookOpen,
  Check,
  Clipboard,
  FileCheck2,
  GraduationCap,
  Languages,
  LoaderCircle,
  Mail,
  MessageCircleHeart,
  Minimize2,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { rewriteText } from "../api";
import { buildWordDiff, MAX_TEXT_LENGTH } from "../lib/text";
import { rewriteTextLocally } from "../lib/demoEngine";
import type { AppSettings, RewriteMode, RewriteResponse } from "../types";
import { PageIntro } from "./Shell";

interface RewritePageProps {
  editorText: string;
  settings: AppSettings;
  onUseInEditor: (text: string) => void;
  onCopy: (text: string) => void;
}

const modes: Array<{ id: RewriteMode; title: string; description: string; icon: typeof Sparkles; ai?: boolean }> = [
  { id: "correct-only", title: "Slegs taalversorging", description: "Maak spelling en grammatika reg; hou jou stem.", icon: FileCheck2 },
  { id: "clearer", title: "Duideliker Afrikaans", description: "Vereenvoudig omslagtige frases en verbeter vloei.", icon: BookOpen },
  { id: "concise", title: "Meer bondig", description: "Sny herhaling en onnodige woorde uit.", icon: Minimize2 },
  { id: "formal", title: "Meer formeel", description: "Gebruik ’n gepaste, neutrale register.", icon: PenLine },
  { id: "friendly", title: "Meer vriendelik", description: "Maak die toon warm en toeganklik.", icon: MessageCircleHeart },
  { id: "professional-email", title: "Professionele e-pos", description: "Struktureer ’n helder, hoflike e-pos.", icon: Mail },
  { id: "academic", title: "Akademies", description: "Gebruik ’n presiese, beredeneerde register.", icon: GraduationCap },
  { id: "plain-language", title: "Gewone taal", description: "Maak ingewikkelde taal makliker om te lees.", icon: BookOpen },
  { id: "informal", title: "Informele SA-Afrikaans", description: "Ontspan die register sonder om betekenis te verloor.", icon: MessageCircleHeart },
  { id: "preserve-wording", title: "Behou my bewoording", description: "Maak net die veiligste, kleinste veranderings.", icon: ShieldCheck },
  { id: "translate-en-af", title: "Engels → Afrikaans", description: "Vertaal na natuurlike Afrikaans.", icon: Languages, ai: true },
  { id: "translate-af-en", title: "Afrikaans → Engels", description: "Vertaal na natuurlike Engels.", icon: Languages, ai: true },
];

export function RewritePage({ editorText, settings, onUseInEditor, onCopy }: RewritePageProps) {
  const [input, setInput] = useState(editorText);
  const [mode, setMode] = useState<RewriteMode>("clearer");
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedMode = modes.find((item) => item.id === mode)!;
  const diff = useMemo(() => result ? buildWordDiff(result.original_text, result.rewritten_text) : [], [result]);

  async function runRewrite() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await rewriteText(input, mode, settings.privacyMode);
      setResult(response);
    } catch (apiError) {
      try {
        const local = rewriteTextLocally(input, mode);
        setResult(local);
        setError(apiError instanceof Error ? `API nie bereikbaar nie. ’n Beperkte plaaslike herskrywing word gewys.` : "Plaaslike demonstrasie word gewys.");
      } catch (localError) {
        setResult(null);
        setError(localError instanceof Error ? localError.message : "Die herskrywing kon nie voltooi word nie.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rewrite-page page-stack">
      <PageIntro
        eyebrow="Opsionele taalhulp"
        title="Herskryf met beheer"
        description="Kies die bedoeling, vergelyk elke verandering en besluit self watter weergawe jy wil gebruik. Name, syfers en aanhalings behoort behoue te bly."
        action={<span className={`privacy-chip ${settings.privacyMode}`}><ShieldCheck size={16} />{settings.privacyMode === "cloud-ai" ? "Wolk-KI aangeskakel" : "Geen derdeparty-KI"}</span>}
      />

      <section className="rewrite-compose card">
        <div className="section-heading">
          <div><span className="step-number">1</span><div><h3>Jou teks</h3><p>Die redigeerderteks is reeds ingesluit.</p></div></div>
          <span className="text-limit">{input.length.toLocaleString("af-ZA")} / {MAX_TEXT_LENGTH.toLocaleString("af-ZA")}</span>
        </div>
        <label className="sr-only" htmlFor="rewrite-input">Teks om te herskryf</label>
        <textarea id="rewrite-input" className="rewrite-input" value={input} maxLength={MAX_TEXT_LENGTH} onChange={(event) => { setInput(event.target.value); setResult(null); }} placeholder="Plak of tik die teks wat jy wil herskryf…" />
      </section>

      <section className="rewrite-modes card">
        <div className="section-heading">
          <div><span className="step-number">2</span><div><h3>Kies ’n skryfstyl</h3><p>Skryfwys verander nie feite doelbewus nie.</p></div></div>
        </div>
        <div className="mode-grid" role="radiogroup" aria-label="Herskryfmodus">
          {modes.map(({ id, title, description, icon: Icon, ai }) => (
            <button type="button" role="radio" aria-checked={mode === id} className={`mode-card ${mode === id ? "selected" : ""}`} key={id} onClick={() => setMode(id)}>
              <span className="mode-icon"><Icon size={19} /></span>
              <span><strong>{title}</strong><small>{description}</small></span>
              {ai && <span className="ai-tag">KI</span>}
              {mode === id && <Check className="mode-check" size={17} />}
            </button>
          ))}
        </div>
        {selectedMode.ai && settings.privacyMode !== "cloud-ai" && (
          <div className="inline-banner warning-banner"><ShieldCheck size={18} /><span>Vertaling benodig ’n gekonfigureerde verskaffer en uitdruklike Wolk-KI-toestemming. Jou privaatheidsmodus is tans veiliger gestel.</span></div>
        )}
        <div className="rewrite-run-row">
          <button className="primary-button large" type="button" disabled={loading || !input.trim() || (selectedMode.ai && settings.privacyMode !== "cloud-ai")} onClick={runRewrite}>
            {loading ? <LoaderCircle className="spin" size={19} /> : <WandSparkles size={19} />}
            {loading ? "Herskryf tans…" : `Herskryf: ${selectedMode.title}`}
          </button>
          <span><ShieldCheck size={15} /> Geen herskrywing word outomaties toegepas nie.</span>
        </div>
      </section>

      {error && <div className={`inline-banner ${result ? "demo-banner" : "error-banner"}`} role="alert"><RefreshCw size={18} /><span>{error}</span></div>}

      {result && (
        <section className="comparison card" aria-live="polite">
          <div className="comparison-header">
            <div>
              <span className="page-eyebrow">Vergelyking</span>
              <h3>Hersiene weergawe</h3>
            </div>
            <div className="comparison-badges">
              <span className={`source-badge ${result.ai_used ? "ai" : "deterministic"}`}>{result.ai_used ? <Sparkles size={14} /> : <ShieldCheck size={14} />}{result.ai_used ? `KI · ${result.provider ?? "verskaffer"}` : "Deterministies"}</span>
              {result.source === "browser-demo" && <span className="source-badge demo">Blaaierdemo</span>}
            </div>
          </div>

          <div className="side-by-side">
            <div className="compare-pane original-pane"><div className="pane-heading"><span>Oorspronklik</span><small>{result.original_text.length} karakters</small></div><div className="compare-text">{result.original_text}</div></div>
            <div className="compare-arrow" aria-hidden="true"><ArrowRight size={19} /></div>
            <div className="compare-pane revised-pane"><div className="pane-heading"><span>Hersien</span><small>{result.rewritten_text.length} karakters</small></div><div className="compare-text">{result.rewritten_text}</div></div>
          </div>

          <div className="inline-diff">
            <div className="pane-heading"><span>Veranderinge in konteks</span><div className="diff-legend"><span><i className="removed" />Verwyder</span><span><i className="added" />Bygevoeg</span></div></div>
            <div className="diff-text">
              {diff.map((part, index) => part.kind === "same" ? <span key={index}>{part.text}</span> : part.kind === "removed" ? <del key={index}>{part.text}</del> : <ins key={index}>{part.text}</ins>)}
            </div>
          </div>

          <div className="change-summary">
            <h4>Opsomming van veranderinge</h4>
            <ul>{result.applied_changes.map((change, index) => <li key={`${change}-${index}`}><Check size={15} />{change}</li>)}</ul>
          </div>
          <div className="comparison-actions">
            <button className="primary-button" type="button" onClick={() => onUseInEditor(result.rewritten_text)}><PenLine size={17} />Gebruik in redigeerder</button>
            <button className="secondary-button" type="button" onClick={() => onCopy(result.rewritten_text)}><Clipboard size={17} />Kopieer hersiene teks</button>
            <button className="ghost-button" type="button" onClick={() => { setInput(result.rewritten_text); setResult(null); }}><RefreshCw size={16} />Herskryf weer</button>
          </div>
        </section>
      )}
    </div>
  );
}
