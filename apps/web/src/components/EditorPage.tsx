import {
  AlertCircle,
  BookPlus,
  Check,
  CheckCheck,
  ChevronDown,
  CircleOff,
  Clipboard,
  Eraser,
  FileText,
  Gauge,
  Info,
  Lightbulb,
  ListFilter,
  LoaderCircle,
  MessageSquareText,
  Redo2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  SpellCheck2,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { t } from "../i18n";
import { getReadingStats, isSafeSuggestion, MAX_TEXT_LENGTH, resolveIssueRange } from "../lib/text";
import type { AppSettings, CheckResponse, DocumentMode, Issue, IssueType, Suggestion } from "../types";
import { EmptyState } from "./Shell";

interface EditorPageProps {
  text: string;
  issues: Issue[];
  activeIssueId: string | null;
  checking: boolean;
  checkMeta?: Pick<CheckResponse, "source" | "processing_time_ms">;
  settings: AppSettings;
  canUndo: boolean;
  canRedo: boolean;
  onTextChange: (text: string) => void;
  onActiveIssue: (id: string | null) => void;
  onCheck: () => void;
  onApply: (issue: Issue, suggestion: Suggestion) => void;
  onAcceptSafe: () => void;
  onIgnoreOnce: (issue: Issue) => void;
  onIgnoreRule: (issue: Issue) => void;
  onAddDictionary: (issue: Issue) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onCopy: () => void;
  onDocumentMode: (mode: DocumentMode) => void;
  onRewrite: () => void;
}

const categoryLabels: Record<IssueType, { af: string; en: string }> = {
  spelling: { af: "Spelling", en: "Spelling" },
  grammar: { af: "Grammatika", en: "Grammar" },
  punctuation: { af: "Leestekens", en: "Punctuation" },
  style: { af: "Styl", en: "Style" },
  terminology: { af: "Terminologie", en: "Terminology" },
  clarity: { af: "Duidelikheid", en: "Clarity" },
};

const documentModes: Array<{ value: DocumentMode; af: string; en: string }> = [
  { value: "general", af: "Algemene Afrikaans", en: "General Afrikaans" },
  { value: "formal", af: "Formeel", en: "Formal" },
  { value: "informal", af: "Informeel", en: "Informal" },
  { value: "academic", af: "Akademies", en: "Academic" },
  { value: "professional", af: "Professioneel", en: "Professional" },
];

function IssueIcon({ type, size = 17 }: { type: IssueType; size?: number }) {
  if (type === "spelling") return <SpellCheck2 size={size} />;
  if (type === "grammar") return <MessageSquareText size={size} />;
  if (type === "punctuation") return <AlertCircle size={size} />;
  if (type === "terminology") return <FileText size={size} />;
  if (type === "clarity") return <Lightbulb size={size} />;
  return <Sparkles size={size} />;
}

function IssueMap({ text, issues, activeIssueId, onActive }: { text: string; issues: Issue[]; activeIssueId: string | null; onActive: (id: string) => void }) {
  const parts = useMemo(() => {
    const resolved = issues
      .map((issue) => ({ issue, range: resolveIssueRange(text, issue) }))
      .filter((item): item is { issue: Issue; range: { start: number; end: number } } => item.range !== null)
      .sort((a, b) => a.range.start - b.range.start);
    const segments: Array<{ text: string; issue?: Issue }> = [];
    let cursor = 0;
    for (const item of resolved) {
      if (item.range.start < cursor) continue;
      if (item.range.start > cursor) segments.push({ text: text.slice(cursor, item.range.start) });
      segments.push({ text: text.slice(item.range.start, item.range.end), issue: item.issue });
      cursor = item.range.end;
    }
    if (cursor < text.length) segments.push({ text: text.slice(cursor) });
    return segments;
  }, [issues, text]);

  if (!text) return <span className="issue-map-placeholder">Jou teks met gemerkte voorstelle sal hier verskyn.</span>;
  return (
    <div className="issue-map-text">
      {parts.map((part, index) =>
        part.issue ? (
          <button
            type="button"
            key={`${part.issue.id}-${index}`}
            className={`issue-mark issue-${part.issue.type} ${part.issue.id === activeIssueId ? "active" : ""}`}
            onClick={() => onActive(part.issue!.id)}
            title={part.issue.message_af}
          >
            {part.text}
            <span className="sr-only">: {part.issue.message_af}</span>
          </button>
        ) : (
          <span key={`plain-${index}`}>{part.text}</span>
        ),
      )}
    </div>
  );
}

function Confidence({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  return <span className="confidence" title={`Vertroue: ${percentage}%`}>{percentage}%</span>;
}

function IssueCard({ issue, active, language, onActive, onApply, onIgnoreOnce, onIgnoreRule, onAddDictionary }: {
  issue: Issue;
  active: boolean;
  language: AppSettings["uiLanguage"];
  onActive: () => void;
  onApply: (suggestion: Suggestion) => void;
  onIgnoreOnce: () => void;
  onIgnoreRule: () => void;
  onAddDictionary: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const message = language === "en" && issue.message_en ? issue.message_en : issue.message_af;
  return (
    <article id={`issue-${issue.id}`} className={`issue-card issue-card-${issue.type} ${active ? "active" : ""}`} onFocus={onActive}>
      <button type="button" className="issue-card-main" onClick={onActive} aria-expanded={active}>
        <span className={`issue-symbol issue-${issue.type}`}><IssueIcon type={issue.type} /></span>
        <span className="issue-card-copy">
          <span className="issue-card-label">
            {categoryLabels[issue.type][language]}
            <Confidence value={issue.confidence} />
          </span>
          <strong><del>{issue.original}</del>{issue.suggestions[0] && <> <span aria-hidden="true">→</span> <ins>{issue.suggestions[0].text}</ins></>}</strong>
        </span>
        <ChevronDown className={`issue-expand ${active ? "open" : ""}`} size={17} aria-hidden="true" />
      </button>
      {active && (
        <div className="issue-detail">
          <p>{message}</p>
          {issue.suggestions.length > 0 && (
            <div className="suggestion-list" aria-label="Voorstelle">
              {issue.suggestions.slice(0, 3).map((item) => (
                <button className="suggestion-button" type="button" key={`${item.text}-${item.source}`} onClick={() => onApply(item)}>
                  <Check size={16} />
                  <span>{item.text}</span>
                  <small>{Math.round(item.confidence * 100)}%</small>
                </button>
              ))}
            </div>
          )}
          <div className="issue-meta"><span>{issue.rule_id}</span><span>{issue.suggestions[0]?.source === "language-model" ? "KI-voorstel" : "Vaste taalreël"}</span></div>
          <div className="issue-actions">
            <button type="button" className="text-button" onClick={onIgnoreOnce}><CircleOff size={15} />{t(language, "ignoreOnce")}</button>
            {issue.type === "spelling" && <button type="button" className="text-button" onClick={onAddDictionary}><BookPlus size={15} />{t(language, "addDictionary")}</button>}
            <button type="button" className="text-button" onClick={() => setMoreOpen((value) => !value)}>{moreOpen ? "Minder" : "Meer"}</button>
          </div>
          {moreOpen && (
            <button type="button" className="ignore-rule-button" onClick={onIgnoreRule}>
              <ShieldAlert size={15} />
              {t(language, "ignoreRule")} · {issue.rule_id}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export function EditorPage(props: EditorPageProps) {
  const { uiLanguage: language } = props.settings;
  const [filter, setFilter] = useState<IssueType | "all">("all");
  const stats = useMemo(() => getReadingStats(props.text), [props.text]);
  const filteredIssues = filter === "all" ? props.issues : props.issues.filter((issue) => issue.type === filter);
  const safeCount = props.issues.filter(isSafeSuggestion).length;
  const categories = Array.from(new Set(props.issues.map((issue) => issue.type)));

  return (
    <div className="editor-page">
      {props.checkMeta?.source === "browser-demo" && (
        <div className="inline-banner demo-banner" role="status">
          <Info size={18} />
          <span><strong>Plaaslike blaaierontleding.</strong> Die API is nie bereikbaar nie; slegs ’n klein, deursigtige stel demo-reëls is gebruik.</span>
        </div>
      )}

      <div className="editor-workspace">
        <section className="document-card" aria-label="Dokumentredigeerder">
          <div className="document-toolbar">
            <div className="document-mode-wrap">
              <FileText size={17} aria-hidden="true" />
              <label htmlFor="document-mode" className="sr-only">Dokumentmodus</label>
              <select id="document-mode" value={props.settings.documentMode} onChange={(event) => props.onDocumentMode(event.target.value as DocumentMode)}>
                {documentModes.map((mode) => <option key={mode.value} value={mode.value}>{mode[language]}</option>)}
              </select>
            </div>
            <div className="toolbar-actions" aria-label="Redigeeraksies">
              <button className="icon-button" type="button" onClick={props.onUndo} disabled={!props.canUndo} aria-label={t(language, "undo")} title={`${t(language, "undo")} (Ctrl+Z)`}><Undo2 size={18} /></button>
              <button className="icon-button" type="button" onClick={props.onRedo} disabled={!props.canRedo} aria-label={t(language, "redo")} title={`${t(language, "redo")} (Ctrl+Shift+Z)`}><Redo2 size={18} /></button>
              <span className="toolbar-divider" />
              <button className="icon-button" type="button" onClick={props.onCopy} disabled={!props.text} aria-label={t(language, "copy")} title={t(language, "copy")}><Clipboard size={18} /></button>
              <button className="icon-button danger-hover" type="button" onClick={props.onClear} disabled={!props.text} aria-label={t(language, "clear")} title={t(language, "clear")}><Eraser size={18} /></button>
            </div>
          </div>

          <label htmlFor="main-editor" className="sr-only">Afrikaanse teks</label>
          <textarea
            id="main-editor"
            className="main-editor"
            value={props.text}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) => props.onTextChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                props.onCheck();
              } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) props.onRedo();
                else props.onUndo();
              } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
                event.preventDefault();
                props.onRedo();
              }
            }}
            spellCheck={false}
            placeholder={language === "af" ? "Tik of plak jou Afrikaanse teks hier…" : "Type or paste your Afrikaans text here…"}
          />

          <div className="issue-map" aria-label="Teks met gemerkte taalvoorstelle">
            <div className="issue-map-heading">
              <span><Sparkles size={15} /> Probleemkaart</span>
              <small>Kies ’n onderstreepte frase vir besonderhede</small>
            </div>
            <IssueMap text={props.text} issues={props.issues} activeIssueId={props.activeIssueId} onActive={(id) => {
              props.onActiveIssue(id);
              document.getElementById(`issue-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }} />
          </div>

          <div className="document-footer">
            <div className="document-stats" aria-label="Dokumentstatistiek">
              <span><strong>{stats.words}</strong> {t(language, "words")}</span>
              <span><strong>{stats.characters}</strong> {t(language, "characters")}</span>
              <span title={`LIX-telling: ${stats.lix}`}><Gauge size={15} /> {t(language, "readability")}: <strong>{stats.level}</strong></span>
              {stats.minutes > 0 && <span>{stats.minutes} min leestyd</span>}
            </div>
            <span className="character-limit">{props.text.length.toLocaleString("af-ZA")} / {MAX_TEXT_LENGTH.toLocaleString("af-ZA")}</span>
          </div>

          <div className="editor-primary-actions">
            <button className="primary-button check-button" type="button" onClick={props.onCheck} disabled={props.checking || !props.text.trim()}>
              {props.checking ? <LoaderCircle className="spin" size={18} /> : <SpellCheck2 size={18} />}
              {props.checking ? t(language, "checking") : t(language, "check")}
              <kbd>Ctrl ↵</kbd>
            </button>
            <button className="secondary-button" type="button" onClick={props.onRewrite} disabled={!props.text.trim()}><Sparkles size={18} />{t(language, "rewrite")}</button>
            {props.checkMeta?.processing_time_ms !== undefined && <span className="processing-time">Laaste kontrole: {props.checkMeta.processing_time_ms} ms</span>}
          </div>
        </section>

        <aside className="issues-panel" aria-label={t(language, "issues")} aria-busy={props.checking}>
          <div className="issues-header">
            <div>
              <span className="panel-kicker">Taalverslag</span>
              <h2>{t(language, "issues")} <span>{props.issues.length}</span></h2>
            </div>
            <button type="button" className="filter-button" onClick={() => setFilter("all")} title="Wys alle kategorieë"><ListFilter size={18} /><span className="sr-only">Wys alle kategorieë</span></button>
          </div>

          {categories.length > 0 && (
            <div className="category-filters" aria-label="Filter voorstelle">
              <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Alles <span>{props.issues.length}</span></button>
              {categories.map((category) => (
                <button type="button" key={category} className={filter === category ? `active issue-${category}` : ""} onClick={() => setFilter(category)}>
                  {categoryLabels[category][language]} <span>{props.issues.filter((issue) => issue.type === category).length}</span>
                </button>
              ))}
            </div>
          )}

          {safeCount > 0 && (
            <div className="safe-all-row">
              <button className="safe-all-button" type="button" onClick={props.onAcceptSafe}>
                <CheckCheck size={18} />
                <span><strong>{t(language, "acceptSafe")}</strong><small>{safeCount} hoëvertroue-, nie-KI-voorstel{safeCount === 1 ? "" : "le"}</small></span>
              </button>
            </div>
          )}

          <div className="issues-list" aria-live="polite">
            {filteredIssues.length ? filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                active={props.activeIssueId === issue.id}
                language={language}
                onActive={() => props.onActiveIssue(issue.id)}
                onApply={(item) => props.onApply(issue, item)}
                onIgnoreOnce={() => props.onIgnoreOnce(issue)}
                onIgnoreRule={() => props.onIgnoreRule(issue)}
                onAddDictionary={() => props.onAddDictionary(issue)}
              />
            )) : (
              <EmptyState icon={props.checking ? <LoaderCircle className="spin" /> : <CheckCheck />} title={props.checking ? "Ons lees jou teks…" : t(language, "noIssues")}>
                {props.text.trim() ? "Kontroleer weer wanneer jy klaar gewysig het." : "Begin tik of plak teks om taalhulp te kry."}
              </EmptyState>
            )}
          </div>
          {filter !== "all" && <button className="reset-filter" type="button" onClick={() => setFilter("all")}><RotateCcw size={14} /> Wis filter</button>}
        </aside>
      </div>
    </div>
  );
}
