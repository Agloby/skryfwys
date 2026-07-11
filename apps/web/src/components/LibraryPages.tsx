import {
  BookHeart,
  Check,
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { csvEscape, downloadText, parseCsvTerms } from "../lib/text";
import type { CustomTerm } from "../types";
import { EmptyState, PageIntro } from "./Shell";

interface DictionaryPageProps {
  terms: CustomTerm[];
  loading: boolean;
  onAdd: (term: CustomTerm) => Promise<void>;
  onDelete: (term: CustomTerm) => Promise<void>;
  onImport: (terms: CustomTerm[]) => Promise<void>;
}

const blankTerm = (): CustomTerm => ({
  term: "",
  preferred: true,
  case_sensitive: false,
  category: "persoonlik",
  alternatives: [],
  source: "user",
  locale: "af-ZA",
});

function exportTerms(terms: CustomTerm[], format: "json" | "csv", basename: string) {
  if (format === "json") {
    downloadText(`${basename}.json`, JSON.stringify(terms, null, 2), "application/json;charset=utf-8");
    return;
  }
  const headings = ["term", "preferred", "case_sensitive", "category", "alternatives", "definition", "notes", "locale"];
  const rows = terms.map((term) => [
    term.term,
    String(term.preferred),
    String(term.case_sensitive),
    term.category,
    term.alternatives.join("|"),
    term.definition ?? "",
    term.notes ?? "",
    term.locale,
  ].map(csvEscape).join(","));
  downloadText(`${basename}.csv`, [headings.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
}

function parseImportedTerms(content: string, filename: string): CustomTerm[] {
  if (filename.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Die JSON-lêer moet ’n lys terme bevat.");
    return parsed.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).term === "string")).map((item) => ({
      ...blankTerm(),
      term: String(item.term),
      preferred: item.preferred !== false,
      case_sensitive: item.case_sensitive === true,
      category: typeof item.category === "string" ? item.category : "ingevoer",
      alternatives: Array.isArray(item.alternatives) ? item.alternatives.map(String) : [],
      definition: typeof item.definition === "string" ? item.definition : undefined,
      notes: typeof item.notes === "string" ? item.notes : undefined,
      locale: typeof item.locale === "string" ? item.locale : "af-ZA",
    }));
  }
  const rows = parseCsvTerms(content);
  if (!rows.length) return [];
  const headers = rows[0].map((value) => value.toLowerCase());
  const termIndex = headers.indexOf("term");
  const startsWithHeader = termIndex >= 0;
  return rows.slice(startsWithHeader ? 1 : 0).map((row) => {
    const value = (name: string, fallbackIndex = -1) => row[headers.indexOf(name) >= 0 ? headers.indexOf(name) : fallbackIndex] ?? "";
    return {
      ...blankTerm(),
      term: value("term", 0),
      preferred: value("preferred").toLowerCase() !== "false",
      case_sensitive: value("case_sensitive").toLowerCase() === "true",
      category: value("category") || "ingevoer",
      alternatives: value("alternatives").split("|").map((item) => item.trim()).filter(Boolean),
      definition: value("definition") || undefined,
      notes: value("notes") || undefined,
      locale: value("locale") || "af-ZA",
    };
  }).filter((term) => term.term.trim());
}

export function DictionaryPage({ terms, loading, onAdd, onDelete, onImport }: DictionaryPageProps) {
  const [form, setForm] = useState(blankTerm);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const filtered = terms.filter((term) => term.term.toLocaleLowerCase("af-ZA").includes(search.toLocaleLowerCase("af-ZA")));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.term.trim()) return;
    setBusy(true);
    try {
      await onAdd({ ...form, term: form.term.trim(), alternatives: form.alternatives.filter(Boolean) });
      setForm(blankTerm());
      setShowForm(false);
      setMessage("Die woord is by jou persoonlike woordeboek gevoeg.");
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const imported = parseImportedTerms(await file.text(), file.name);
      await onImport(imported);
      setMessage(`${imported.length} term${imported.length === 1 ? "" : "e"} is ingevoer.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Die lêer kon nie gelees word nie.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="library-page page-stack">
      <PageIntro eyebrow="Jou taal, jou beheer" title="Persoonlike woordeboek" description="Woorde wat jy goedkeur, word nie weer as spelfoute gemerk nie. In plaaslike modus bly hulle op jou eie Skryfwys-bediener." action={<button className="primary-button" type="button" onClick={() => setShowForm(true)}><Plus size={17} />Voeg woord by</button>} />

      <div className="privacy-callout"><ShieldCheck size={20} /><div><strong>Slegs terme word gestoor</strong><p>Jou dokumentteks word nie saam met ’n woordeboekinskrywing bewaar nie.</p></div></div>
      {message && <div className="inline-banner success-banner" role="status"><Check size={18} /><span>{message}</span><button type="button" onClick={() => setMessage(null)} aria-label="Maak boodskap toe">×</button></div>}

      {showForm && (
        <section className="term-form-card card">
          <div className="section-heading"><div><span className="step-number"><Plus size={17} /></span><div><h3>Nuwe woord</h3><p>Voeg net woorde by wat jy doelbewus wil aanvaar.</p></div></div><button className="ghost-button" type="button" onClick={() => setShowForm(false)}>Kanselleer</button></div>
          <form className="term-form" onSubmit={submit}>
            <label>Woord of term<input autoFocus value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} placeholder="bv. Skryfwys" required /></label>
            <label>Kategorie<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="persoonlik">Persoonlik</option><option value="maatskappy">Maatskappy</option><option value="naam">Naam</option><option value="vakterm">Vakterm</option></select></label>
            <label className="wide">Alternatiewe <span>(opsioneel, geskei deur kommas)</span><input value={form.alternatives.join(", ")} onChange={(event) => setForm({ ...form, alternatives: event.target.value.split(",").map((item) => item.trim()) })} /></label>
            <label className="checkbox-label"><input type="checkbox" checked={form.case_sensitive} onChange={(event) => setForm({ ...form, case_sensitive: event.target.checked })} /><span>Hooflettergevoelig</span></label>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <BookHeart size={17} />}Stoor woord</button>
          </form>
        </section>
      )}

      <section className="term-table-card card">
        <div className="table-toolbar">
          <label className="compact-search"><Search size={17} /><span className="sr-only">Soek woorde</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Soek jou woordeboek…" /></label>
          <div className="table-actions">
            <input className="sr-only" ref={fileRef} type="file" accept=".json,.csv,text/csv,application/json" onChange={(event) => importFile(event.target.files?.[0])} />
            <button className="secondary-button small" type="button" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={15} />Voer in</button>
            <button className="secondary-button small" type="button" onClick={() => exportTerms(terms, "csv", "skryfwys-woordeboek")} disabled={!terms.length}><FileSpreadsheet size={15} />CSV</button>
            <button className="secondary-button small" type="button" onClick={() => exportTerms(terms, "json", "skryfwys-woordeboek")} disabled={!terms.length}><FileJson size={15} />JSON</button>
          </div>
        </div>
        {loading ? <EmptyState icon={<LoaderCircle className="spin" />} title="Laai jou woorde">Net ’n oomblik…</EmptyState> : filtered.length ? (
          <div className="responsive-table"><table><thead><tr><th>Term</th><th>Kategorie</th><th>Eienskappe</th><th><span className="sr-only">Aksies</span></th></tr></thead><tbody>{filtered.map((term) => (
            <tr key={String(term.id ?? `${term.category}-${term.term}`)}><td><strong>{term.term}</strong>{term.alternatives.length > 0 && <small>Ook: {term.alternatives.join(", ")}</small>}</td><td><span className="category-pill">{term.category}</span></td><td><span>{term.case_sensitive ? "Hooflettergevoelig" : "Enige hoofletters"}</span></td><td><button className="icon-button danger-hover" type="button" onClick={() => onDelete(term)} aria-label={`Verwyder ${term.term}`}><Trash2 size={17} /></button></td></tr>
          ))}</tbody></table></div>
        ) : <EmptyState icon={<BookHeart />} title={search ? "Geen ooreenstemmende woorde" : "Jou woordeboek is nog leeg"}>{search ? "Probeer ’n ander soekterm." : "Voeg name, plaaslike woorde en goedgekeurde vakterme by."}</EmptyState>}
      </section>
    </div>
  );
}

const seedTerms: CustomTerm[] = [
  { term: "hoeveelheidsopmeter", preferred: true, case_sensitive: false, category: "hoeveelheidsopmeting", alternatives: ["bourekenaar"], source: "Skryfwys seed", locale: "af-ZA" },
  { term: "hoeveelheidslys", preferred: true, case_sensitive: false, category: "hoeveelheidsopmeting", alternatives: [], source: "Skryfwys seed", locale: "af-ZA" },
  { term: "kosteberaming", preferred: true, case_sensitive: false, category: "koste", alternatives: [], source: "Skryfwys seed", locale: "af-ZA" },
  { term: "betalingssertifikaat", preferred: true, case_sensitive: false, category: "kontrak", alternatives: [], source: "Skryfwys seed", locale: "af-ZA" },
  { term: "eenheidskoers", preferred: true, case_sensitive: false, category: "koste", alternatives: [], source: "Skryfwys seed", locale: "af-ZA" },
  { term: "bruto vloeroppervlakte", preferred: true, case_sensitive: false, category: "meting", alternatives: [], source: "Skryfwys seed", locale: "af-ZA" },
  { term: "variasie", preferred: false, case_sensitive: false, category: "kontrak", alternatives: ["wysigingsopdrag"], notes: "Gebruik volgens projek- of kontrakvoorkeur.", source: "Skryfwys seed", locale: "af-ZA" },
  { term: "tenderbedrag", preferred: true, case_sensitive: false, category: "tender", alternatives: [], source: "Skryfwys seed", locale: "af-ZA" },
];

export function TerminologyPage({ personalTerms, onAdd }: { personalTerms: CustomTerm[]; onAdd: (term: CustomTerm) => Promise<void> }) {
  const [collection, setCollection] = useState("construction");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<CustomTerm>({ ...blankTerm(), category: "maatskappy" });
  const [busy, setBusy] = useState(false);
  const allTerms = useMemo(() => collection === "personal" ? personalTerms : seedTerms, [collection, personalTerms]);
  const filtered = allTerms.filter((term) => `${term.term} ${term.alternatives.join(" ")} ${term.category}`.toLocaleLowerCase("af-ZA").includes(search.toLocaleLowerCase("af-ZA")));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.term.trim()) return;
    setBusy(true);
    try {
      await onAdd({ ...form, term: form.term.trim(), source: "user" });
      setForm({ ...blankTerm(), category: "maatskappy" });
      setShowAdd(false);
      setCollection("personal");
    } finally { setBusy(false); }
  }

  return (
    <div className="library-page page-stack">
      <PageIntro eyebrow="Konsekwente vaktaal" title="Terminologielyste" description="Bestuur voorkeurterme en alternatiewe vir ’n beroep, projek of maatskappy. Die ingeboude lys is klein en oorspronklik saamgestel." action={<button className="primary-button" type="button" onClick={() => setShowAdd(true)}><Plus size={17} />Nuwe term</button>} />

      <div className="collection-grid">
        <button type="button" className={`collection-card ${collection === "construction" ? "selected" : ""}`} onClick={() => setCollection("construction")}><span className="collection-icon"><FolderOpen /></span><span><strong>Konstruksie & hoeveelheidsopmeting</strong><small>{seedTerms.length} oorspronklike saadterme</small></span>{collection === "construction" && <Check size={18} />}</button>
        <button type="button" className={`collection-card ${collection === "personal" ? "selected" : ""}`} onClick={() => setCollection("personal")}><span className="collection-icon personal"><Tags /></span><span><strong>My terme</strong><small>{personalTerms.length} persoonlike terme</small></span>{collection === "personal" && <Check size={18} />}</button>
        <button type="button" className="collection-card disabled" disabled><span className="collection-icon"><FolderOpen /></span><span><strong>Regs & kontrakte</strong><small>Adapter gereed; geen gelisensieerde data gebundel nie</small></span><span className="soon-tag">Later</span></button>
      </div>

      {showAdd && <section className="term-form-card card"><div className="section-heading"><div><span className="step-number"><Plus size={17} /></span><div><h3>Voeg voorkeurterm by</h3><p>Alternatiewe word as konteks gewys, nie blindelings vervang nie.</p></div></div></div><form className="term-form" onSubmit={submit}>
        <label>Term<input autoFocus required value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} /></label>
        <label>Kategorie<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
        <label className="wide">Alternatiewe<input value={form.alternatives.join(", ")} onChange={(event) => setForm({ ...form, alternatives: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
        <label className="wide">Nota<textarea rows={2} value={form.notes ?? ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Wanneer of waarom behoort hierdie term gebruik te word?" /></label>
        <label className="checkbox-label"><input type="checkbox" checked={form.preferred} onChange={(event) => setForm({ ...form, preferred: event.target.checked })} /><span>Merk as voorkeurterm</span></label>
        <div className="form-actions"><button className="ghost-button" type="button" onClick={() => setShowAdd(false)}>Kanselleer</button><button className="primary-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}Stoor term</button></div>
      </form></section>}

      <section className="term-table-card card">
        <div className="table-toolbar"><label className="compact-search"><Search size={17} /><span className="sr-only">Soek terme</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Soek term of alternatief…" /></label><div className="table-actions"><button className="secondary-button small" type="button" onClick={() => exportTerms(allTerms, "csv", "skryfwys-terminologie")}><Download size={15} />Voer CSV uit</button></div></div>
        {filtered.length ? <div className="responsive-table"><table><thead><tr><th>Term</th><th>Voorkeur</th><th>Alternatiewe</th><th>Kategorie</th></tr></thead><tbody>{filtered.map((term) => <tr key={`${term.category}-${term.term}`}><td><strong>{term.term}</strong>{term.notes && <small>{term.notes}</small>}</td><td>{term.preferred ? <span className="preferred-mark"><Check size={14} />Voorkeur</span> : <span>Variant</span>}</td><td>{term.alternatives.length ? term.alternatives.join(", ") : "—"}</td><td><span className="category-pill">{term.category}</span></td></tr>)}</tbody></table></div> : <EmptyState icon={<Tags />} title="Geen terme gevind nie">Pas jou soektog aan of voeg ’n term by.</EmptyState>}
        <footer className="table-footnote"><ShieldCheck size={15} /> Die saadterme is projek-geskryf en nie uit HAT of WAT gekopieer nie.</footer>
      </section>
    </div>
  );
}
