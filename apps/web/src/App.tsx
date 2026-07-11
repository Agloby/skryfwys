import { CheckCircle2, Info, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  addCustomTerm,
  checkText,
  deleteCustomTerm,
  getDiagnostics,
  getHealth,
  listCustomTerms,
} from "./api";
import { EditorPage } from "./components/EditorPage";
import {
  AboutPage,
  DiagnosticsPage,
  PrivacyPage,
  SettingsPage,
  SourcesPage,
} from "./components/InfoPages";
import { DictionaryPage, TerminologyPage } from "./components/LibraryPages";
import { RewritePage } from "./components/RewritePage";
import { Shell } from "./components/Shell";
import { WordHelperPage } from "./components/WordHelperPage";
import { usePersistentState } from "./hooks/usePersistentState";
import { checkTextLocally } from "./lib/demoEngine";
import { historyReducer } from "./lib/history";
import { applyIssue, applySafeIssues } from "./lib/text";
import type {
  ApiHealth,
  AppSettings,
  CheckResponse,
  CustomTerm,
  Issue,
  IssueType,
  Suggestion,
  UiLanguage,
  ViewId,
} from "./types";
import "./styles.css";

const SAMPLE_TEXT = "Die hoeveelheid opmeter het die koste beraming hersien. Die kontrakteur het die werk vol tooi. Stuur asb die dokument aan my!!";

const DEFAULT_SETTINGS: AppSettings = {
  uiLanguage: "af",
  privacyMode: "local",
  documentMode: "general",
  saveHistory: false,
  autoCheck: false,
  enabledCategories: ["spelling", "grammar", "punctuation", "style", "terminology", "clarity"],
};

const validViews = new Set<ViewId>([
  "editor",
  "rewrite",
  "word-helper",
  "dictionary",
  "terminology",
  "settings",
  "privacy",
  "sources",
  "about",
  "diagnostics",
]);

function currentHashView(): ViewId {
  const hash = window.location.hash.slice(1) as ViewId;
  return validViews.has(hash) ? hash : "editor";
}

function mergeTerms(local: CustomTerm[], remote: CustomTerm[]): CustomTerm[] {
  const byKey = new Map<string, CustomTerm>();
  for (const term of [...local, ...remote]) {
    byKey.set(`${term.locale}:${term.term.toLocaleLowerCase("af-ZA")}`, term);
  }
  return [...byKey.values()].sort((a, b) => a.term.localeCompare(b.term, "af"));
}

export default function App() {
  const [view, setView] = useState<ViewId>(currentHashView);
  const [settings, setSettings] = usePersistentState<AppSettings>("skryfwys:settings", DEFAULT_SETTINGS);
  const [ignoredRules, setIgnoredRules] = usePersistentState<string[]>("skryfwys:ignored-rules", []);
  const [terms, setTerms] = usePersistentState<CustomTerm[]>("skryfwys:custom-terms", []);
  const savedText = settings.saveHistory ? localStorage.getItem("skryfwys:document") ?? SAMPLE_TEXT : SAMPLE_TEXT;
  const [history, dispatch] = useReducer(historyReducer, { past: [], present: savedText, future: [] });
  const [rawIssues, setRawIssues] = useState<Issue[]>([]);
  const [ignoredOnce, setIgnoredOnce] = useState<Set<string>>(() => new Set());
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMeta, setCheckMeta] = useState<Pick<CheckResponse, "source" | "processing_time_ms">>();
  const [health, setHealth] = useState<ApiHealth>({ status: "checking" });
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "info" } | null>(null);
  const requestSequence = useRef(0);

  const showToast = useCallback((message: string, tone: "success" | "info" = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3_600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onHash = () => setView(currentHashView());
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) window.history.replaceState(null, "", "#editor");
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((next: ViewId) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next;
    else setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    setHealth({ status: "checking" });
    const [nextHealth, nextDiagnostics] = await Promise.all([getHealth(), getDiagnostics()]);
    setHealth(nextHealth);
    setDiagnostics(nextDiagnostics);
  }, []);

  useEffect(() => { void refreshDiagnostics(); }, [refreshDiagnostics]);

  useEffect(() => {
    let cancelled = false;
    listCustomTerms()
      .then((remote) => { if (!cancelled) setTerms((local) => mergeTerms(local, remote)); })
      .catch(() => { /* Local terms remain usable while the service is offline. */ })
      .finally(() => { if (!cancelled) setDictionaryLoading(false); });
    return () => { cancelled = true; };
  }, [setTerms]);

  useEffect(() => {
    if (settings.saveHistory) localStorage.setItem("skryfwys:document", history.present);
    else localStorage.removeItem("skryfwys:document");
  }, [history.present, settings.saveHistory]);

  const visibleIssues = useMemo(() => {
    const acceptedTerms = new Set(terms.map((term) => term.term.toLocaleLowerCase("af-ZA")));
    const enabled = new Set<IssueType>(settings.enabledCategories);
    return rawIssues.filter((issue) =>
      !ignoredOnce.has(issue.id) &&
      !ignoredRules.includes(issue.rule_id) &&
      enabled.has(issue.type) &&
      !(issue.type === "spelling" && acceptedTerms.has(issue.original.toLocaleLowerCase("af-ZA"))),
    );
  }, [ignoredOnce, ignoredRules, rawIssues, settings.enabledCategories, terms]);

  const runCheck = useCallback(async (value = history.present) => {
    if (!value.trim()) {
      setRawIssues([]);
      setCheckMeta(undefined);
      return;
    }
    const requestId = ++requestSequence.current;
    setChecking(true);
    setActiveIssueId(null);
    const request = {
      text: value,
      privacy_mode: settings.privacyMode,
      document_mode: settings.documentMode,
      disabled_rules: ignoredRules,
      ignore_words: terms.map((term) => term.term),
      user_id: "guest",
    } as const;
    try {
      const response = await checkText(request);
      if (requestId !== requestSequence.current) return;
      setRawIssues(response.issues);
      setCheckMeta({ source: response.source, processing_time_ms: response.processing_time_ms });
      setHealth((current) => ({ ...current, status: "online", checkedAt: new Date().toISOString() }));
      setIgnoredOnce(new Set());
    } catch {
      if (requestId !== requestSequence.current) return;
      const response = checkTextLocally(request);
      setRawIssues(response.issues);
      setCheckMeta({ source: response.source, processing_time_ms: response.processing_time_ms });
      setHealth((current) => ({ ...current, status: "offline", detail: "API nie bereikbaar nie; beperkte blaaierdemo aktief.", checkedAt: new Date().toISOString() }));
    } finally {
      if (requestId === requestSequence.current) setChecking(false);
    }
  }, [history.present, ignoredRules, settings.documentMode, settings.privacyMode, terms]);

  useEffect(() => {
    if (!settings.autoCheck || !history.present.trim()) return;
    const timer = window.setTimeout(() => void runCheck(history.present), 900);
    return () => window.clearTimeout(timer);
  }, [history.present, runCheck, settings.autoCheck]);

  function changeText(value: string, keepIssues = false) {
    requestSequence.current += 1;
    dispatch({ type: "set", value });
    if (!keepIssues) {
      setRawIssues([]);
      setCheckMeta(undefined);
      setIgnoredOnce(new Set());
      setActiveIssueId(null);
      setChecking(false);
    }
  }

  function applySuggestion(issue: Issue, suggestion: Suggestion) {
    const next = applyIssue(history.present, issue, suggestion);
    if (next === null) {
      showToast("Die teks het verander. Kontroleer weer voordat jy dié voorstel toepas.", "info");
      return;
    }
    changeText(next);
    showToast(`“${suggestion.text}” is toegepas.`);
    void runCheck(next);
  }

  function acceptSafe() {
    const result = applySafeIssues(history.present, visibleIssues);
    if (!result.applied.length) return;
    changeText(result.text);
    showToast(`${result.applied.length} veilige voorstel${result.applied.length === 1 ? "" : "le"} toegepas.`);
    void runCheck(result.text);
  }

  async function addTerm(term: CustomTerm) {
    const existing = terms.some((item) => item.term.toLocaleLowerCase("af-ZA") === term.term.toLocaleLowerCase("af-ZA"));
    if (existing) {
      showToast(`“${term.term}” is reeds in jou biblioteek.`, "info");
      return;
    }
    const localTerm = { ...term, id: term.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setTerms((current) => mergeTerms(current, [localTerm]));
    try {
      const stored = await addCustomTerm(term);
      setTerms((current) => mergeTerms(current.filter((item) => item.id !== localTerm.id), [stored]));
    } catch {
      showToast("Die term is plaaslik bewaar; die API is tans nie bereikbaar nie.", "info");
    }
  }

  async function removeTerm(term: CustomTerm) {
    setTerms((current) => current.filter((item) => item !== term && item.id !== term.id));
    if (term.id !== undefined && !String(term.id).startsWith("local-")) {
      try { await deleteCustomTerm(term.id); }
      catch { showToast("Plaaslik verwyder; die bediener kon nie bereik word nie.", "info"); }
    }
  }

  async function importTerms(imported: CustomTerm[]) {
    for (const term of imported) await addTerm(term);
  }

  async function copyText(value = history.present) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Teks is na die knipbord gekopieer.");
    } catch {
      showToast("Die blaaier het knipbordtoegang geweier.", "info");
    }
  }

  function undo() {
    if (!history.past.length) return;
    requestSequence.current += 1;
    dispatch({ type: "undo" });
    setRawIssues([]);
    setActiveIssueId(null);
  }

  function redo() {
    if (!history.future.length) return;
    requestSequence.current += 1;
    dispatch({ type: "redo" });
    setRawIssues([]);
    setActiveIssueId(null);
  }

  function deleteLocalData() {
    if (!window.confirm("Vee jou persoonlike terme, geïgnoreerde reëls, instellings en gestoorde dokumentgeskiedenis uit?")) return;
    for (const key of Object.keys(localStorage)) if (key.startsWith("skryfwys:")) localStorage.removeItem(key);
    setTerms([]);
    setIgnoredRules([]);
    setSettings(DEFAULT_SETTINGS);
    dispatch({ type: "reset", value: "" });
    setRawIssues([]);
    showToast("Jou plaaslike Skryfwys-data is uitgevee.");
  }

  let page;
  switch (view) {
    case "editor":
      page = <EditorPage
        text={history.present}
        issues={visibleIssues}
        activeIssueId={activeIssueId}
        checking={checking}
        checkMeta={checkMeta}
        settings={settings}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onTextChange={changeText}
        onActiveIssue={setActiveIssueId}
        onCheck={() => void runCheck()}
        onApply={applySuggestion}
        onAcceptSafe={acceptSafe}
        onIgnoreOnce={(issue) => { setIgnoredOnce((current) => new Set(current).add(issue.id)); setActiveIssueId(null); showToast("Voorstel een keer geïgnoreer.", "info"); }}
        onIgnoreRule={(issue) => { setIgnoredRules((current) => current.includes(issue.rule_id) ? current : [...current, issue.rule_id]); setActiveIssueId(null); showToast(`${issue.rule_id} is afgeskakel.`, "info"); }}
        onAddDictionary={(issue) => { void addTerm({ ...blankCustomTerm(issue.original), category: "persoonlik" }).then(() => { setIgnoredOnce((current) => new Set(current).add(issue.id)); showToast(`“${issue.original}” is by jou woordeboek gevoeg.`); }); }}
        onUndo={undo}
        onRedo={redo}
        onClear={() => changeText("")}
        onCopy={() => void copyText()}
        onDocumentMode={(documentMode) => setSettings({ ...settings, documentMode })}
        onRewrite={() => navigate("rewrite")}
      />;
      break;
    case "rewrite":
      page = <RewritePage editorText={history.present} settings={settings} onUseInEditor={(text) => { changeText(text); navigate("editor"); showToast("Die hersiene teks is in die redigeerder."); }} onCopy={(text) => void copyText(text)} />;
      break;
    case "word-helper":
      page = <WordHelperPage onUseWord={(word) => { changeText(history.present.trim() ? `${history.present} ${word}` : word); navigate("editor"); showToast(`“${word}” is by die redigeerder gevoeg.`); }} />;
      break;
    case "dictionary":
      page = <DictionaryPage terms={terms} loading={dictionaryLoading} onAdd={addTerm} onDelete={removeTerm} onImport={importTerms} />;
      break;
    case "terminology":
      page = <TerminologyPage personalTerms={terms} onAdd={addTerm} />;
      break;
    case "settings":
      page = <SettingsPage settings={settings} ignoredRules={ignoredRules} termCount={terms.length} onSettings={setSettings} onRestoreRule={(rule) => setIgnoredRules((current) => current.filter((item) => item !== rule))} />;
      break;
    case "privacy":
      page = <PrivacyPage settings={settings} onMode={(privacyMode) => { setSettings({ ...settings, privacyMode }); showToast("Privaatheidsmodus is opgedateer."); }} termCount={terms.length} onDeleteData={deleteLocalData} />;
      break;
    case "sources": page = <SourcesPage />; break;
    case "about": page = <AboutPage />; break;
    case "diagnostics": page = <DiagnosticsPage health={health} diagnostics={diagnostics} onRefresh={refreshDiagnostics} lastCheckMs={checkMeta?.processing_time_ms} />; break;
  }

  return (
    <Shell view={view} onNavigate={navigate} settings={settings} onLanguageChange={(uiLanguage: UiLanguage) => setSettings({ ...settings, uiLanguage })} health={health}>
      {page}
      {toast && <div className={`toast ${toast.tone}`} role="status" aria-live="polite">{toast.tone === "success" ? <CheckCircle2 size={18} /> : <Info size={18} />}<span>{toast.message}</span><button type="button" onClick={() => setToast(null)} aria-label="Maak kennisgewing toe"><X size={16} /></button></div>}
    </Shell>
  );
}

function blankCustomTerm(term: string): CustomTerm {
  return {
    term,
    preferred: true,
    case_sensitive: false,
    category: "persoonlik",
    alternatives: [],
    source: "user",
    locale: "af-ZA",
  };
}
