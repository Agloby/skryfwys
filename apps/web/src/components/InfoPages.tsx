import {
  Activity,
  AlertTriangle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileClock,
  FileText,
  Gauge,
  Github,
  Globe2,
  HardDrive,
  Heart,
  Info,
  Languages,
  Laptop,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { downloadText } from "../lib/text";
import type { ApiHealth, AppSettings, DocumentMode, IssueType, PrivacyMode } from "../types";
import { PageIntro } from "./Shell";

interface SettingsPageProps {
  settings: AppSettings;
  ignoredRules: string[];
  termCount: number;
  onSettings: (settings: AppSettings) => void;
  onRestoreRule: (rule: string) => void;
}

const categories: Array<{ id: IssueType; label: string; description: string }> = [
  { id: "spelling", label: "Spelling", description: "Spelfoute, samestellings en tikfoute" },
  { id: "grammar", label: "Grammatika", description: "Konserwatiewe, hoë-sekerheidsreëls" },
  { id: "punctuation", label: "Leestekens", description: "Spasiëring en herhaalde leestekens" },
  { id: "style", label: "Styl", description: "Register, informaliteit en woordkeuse" },
  { id: "terminology", label: "Terminologie", description: "Voorkeur- en vakterme" },
  { id: "clarity", label: "Duidelikheid", description: "Lang of moeilike sinne" },
];

export function SettingsPage({ settings, ignoredRules, termCount, onSettings, onRestoreRule }: SettingsPageProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => onSettings({ ...settings, [key]: value });
  return (
    <div className="settings-page page-stack">
      <PageIntro eyebrow="Pas Skryfwys aan" title="Instellings" description="Kies hoe die redigeerder praat, watter dokumentregister geld en watter taalvoorstelle jy wil sien." />
      <div className="settings-grid">
        <section className="settings-card card">
          <div className="settings-card-heading"><Languages size={20} /><div><h3>Koppelvlaktaal</h3><p>Afrikaans is die primêre taal.</p></div></div>
          <div className="segmented-control" role="radiogroup" aria-label="Koppelvlaktaal">
            <button type="button" role="radio" aria-checked={settings.uiLanguage === "af"} className={settings.uiLanguage === "af" ? "active" : ""} onClick={() => update("uiLanguage", "af")}>Afrikaans</button>
            <button type="button" role="radio" aria-checked={settings.uiLanguage === "en"} className={settings.uiLanguage === "en" ? "active" : ""} onClick={() => update("uiLanguage", "en")}>English</button>
          </div>
        </section>
        <section className="settings-card card">
          <div className="settings-card-heading"><FileText size={20} /><div><h3>Verstek dokumentmodus</h3><p>Beïnvloed register- en stylvoorstelle.</p></div></div>
          <label className="select-label">Dokumentmodus<select value={settings.documentMode} onChange={(event) => update("documentMode", event.target.value as DocumentMode)}><option value="general">Algemeen</option><option value="formal">Formeel</option><option value="informal">Informeel</option><option value="academic">Akademies</option><option value="professional">Professioneel</option></select></label>
        </section>
        <section className="settings-card card wide">
          <div className="settings-card-heading"><Settings2 size={20} /><div><h3>Taalvoorstelle</h3><p>Skakel kategorieë af sonder om individuele reëls te verloor.</p></div></div>
          <div className="toggle-list">{categories.map((category) => {
            const enabled = settings.enabledCategories.includes(category.id);
            return <label key={category.id} className="toggle-row"><span><strong>{category.label}</strong><small>{category.description}</small></span><input type="checkbox" checked={enabled} onChange={(event) => update("enabledCategories", event.target.checked ? [...settings.enabledCategories, category.id] : settings.enabledCategories.filter((item) => item !== category.id))} /><span className="toggle-switch" aria-hidden="true" /></label>;
          })}</div>
        </section>
        <section className="settings-card card">
          <div className="settings-card-heading"><FileClock size={20} /><div><h3>Kontrolegedrag</h3><p>Outomatiese kontrole is standaard af.</p></div></div>
          <label className="toggle-row"><span><strong>Kontroleer terwyl ek tik</strong><small>Stuur ná ’n kort wag na jou gekose diens.</small></span><input type="checkbox" checked={settings.autoCheck} onChange={(event) => update("autoCheck", event.target.checked)} /><span className="toggle-switch" aria-hidden="true" /></label>
          <label className="toggle-row"><span><strong>Bewaar dokumentgeskiedenis</strong><small>Af by verstek; teks word andersins nie bewaar nie.</small></span><input type="checkbox" checked={settings.saveHistory} onChange={(event) => update("saveHistory", event.target.checked)} /><span className="toggle-switch" aria-hidden="true" /></label>
        </section>
        <section className="settings-card card">
          <div className="settings-card-heading"><BookOpenCheck size={20} /><div><h3>Persoonlike taaldata</h3><p>{termCount} term{termCount === 1 ? "" : "e"} in jou biblioteek.</p></div></div>
          <div className="metric-row"><span>Geïgnoreerde reëls</span><strong>{ignoredRules.length}</strong></div>
          {ignoredRules.length ? <div className="ignored-rules">{ignoredRules.map((rule) => <button type="button" key={rule} onClick={() => onRestoreRule(rule)}>{rule}<span>Herstel</span></button>)}</div> : <p className="muted-copy">Geen taalreëls is permanent geïgnoreer nie.</p>}
        </section>
      </div>
    </div>
  );
}

export function PrivacyPage({ settings, onMode, termCount, onDeleteData }: { settings: AppSettings; onMode: (mode: PrivacyMode) => void; termCount: number; onDeleteData: () => void }) {
  const [cloudConsent, setCloudConsent] = useState(false);
  const modes: Array<{ id: PrivacyMode; icon: typeof Laptop; title: string; badge: string; description: string; details: string[] }> = [
    { id: "local", icon: Laptop, title: "Plaaslike modus", badge: "Aanbeveel", description: "Deterministiese taalreëls werk deur jou eie Skryfwys-opstelling. Geen eksterne KI word geroep nie.", details: ["Geen derdeparty-KI", "Persoonlike woordeboek bly plaaslik", "Volledige kernkontrole"] },
    { id: "private-server", icon: Server, title: "Privaat bediener", badge: "Self gehuisves", description: "Teks gaan net na die Skryfwys-bediener wat jou organisasie beheer.", details: ["Geen derdeparty-KI by verstek", "Organisasiebeheerde infrastruktuur", "Dieselfde API en taalreëls"] },
    { id: "cloud-ai", icon: Cloud, title: "Wolk-KI-modus", badge: "Uitdruklike toestemming", description: "Maak gevorderde herskryf en vertaling moontlik deur ’n gekonfigureerde eksterne verskaffer.", details: ["Verskaffer moet eers op die bediener ingestel word", "Teks kan die organisasie se grens verlaat", "Enige tyd afskakelbaar"] },
  ];

  const exportData = () => downloadText("skryfwys-my-data.json", JSON.stringify({ exported_at: new Date().toISOString(), settings, personal_term_count: termCount, note: "Dokumentteks is nie deel van hierdie uitvoer nie." }, null, 2), "application/json;charset=utf-8");

  return (
    <div className="privacy-page page-stack">
      <PageIntro eyebrow="Privaatheid eerste" title="Jy besluit waar jou teks gaan" description="Die aktiewe modus bly altyd sigbaar. Skryfwys stoor nie dokumentteks by verstek nie en aktiveer nie Wolk-KI stilweg nie." />
      <div className="privacy-hero card"><div className="privacy-hero-icon"><LockKeyhole /></div><div><span>Huidige beskerming</span><h3>{settings.privacyMode === "local" ? "Geen teks gaan na ’n eksterne KI nie" : settings.privacyMode === "private-server" ? "Teks gaan slegs na jou privaat bediener" : "Wolk-KI is uitdruklik geaktiveer"}</h3><p>{settings.saveHistory ? "Dokumentgeskiedenis is aangeskakel in Instellings." : "Dokumentgeskiedenis is af; teks word nie by verstek bewaar nie."}</p></div><ShieldCheck className="privacy-hero-check" /></div>
      <section>
        <div className="section-heading standalone"><div><span className="step-number">1</span><div><h3>Kies jou privaatheidsmodus</h3><p>Kontrole verander onmiddellik; Wolk-KI vra ekstra toestemming.</p></div></div></div>
        <div className="privacy-mode-grid">{modes.map(({ id, icon: Icon, title, badge, description, details }) => <article className={`privacy-mode-card card ${settings.privacyMode === id ? "selected" : ""}`} key={id}><div className="privacy-mode-top"><span className={`privacy-mode-icon ${id}`}><Icon /></span><span className="mode-badge">{badge}</span></div><h3>{title}</h3><p>{description}</p><ul>{details.map((detail) => <li key={detail}><Check size={15} />{detail}</li>)}</ul>{id === "cloud-ai" ? <div className="cloud-consent"><label className="checkbox-label"><input type="checkbox" checked={cloudConsent || settings.privacyMode === "cloud-ai"} onChange={(event) => setCloudConsent(event.target.checked)} /><span>Ek verstaan dat teks na ’n gekonfigureerde eksterne verskaffer kan gaan.</span></label><button className={settings.privacyMode === id ? "selected-mode-button" : "primary-button"} type="button" disabled={!cloudConsent && settings.privacyMode !== "cloud-ai"} onClick={() => onMode(id)}>{settings.privacyMode === id ? <><CheckCircle2 size={17} />Aktief</> : "Aktiveer met toestemming"}</button></div> : <button className={settings.privacyMode === id ? "selected-mode-button" : "secondary-button"} type="button" onClick={() => onMode(id)}>{settings.privacyMode === id ? <><CheckCircle2 size={17} />Aktief</> : "Gebruik hierdie modus"}</button>}</article>)}</div>
      </section>
      <section className="data-control card">
        <div><div className="settings-card-heading"><Database size={20} /><div><h3>Jou data</h3><p>Voer instellingsmetadata uit of verwyder plaaslik bewaarde voorkeure.</p></div></div><div className="data-facts"><span><strong>{termCount}</strong> persoonlike terme</span><span><strong>{settings.saveHistory ? "Aan" : "Af"}</strong> dokumentgeskiedenis</span><span><strong>0</strong> dokumente by verstek gestoor</span></div></div>
        <div className="data-actions"><button className="secondary-button" type="button" onClick={exportData}><Download size={16} />Voer my data uit</button><button className="danger-button" type="button" onClick={onDeleteData}><Trash2 size={16} />Vee my plaaslike data uit</button></div>
      </section>
      <div className="inline-banner info-banner"><Info size={18} /><span>Skryfwys gebruik nie jou teks vir modelopleiding nie. Bedienerlogboeke behoort slegs metadata, nie rou teks nie, te bevat.</span></div>
    </div>
  );
}

const sourceRows = [
  ["Skryfwys-saadwoordelys", "Oorspronklik vir hierdie projek geskryf", "MIT (projeklisensie)", "Ja", "Nee", "Gebundel"],
  ["Skryfwys-konstruksieterminologie", "Oorspronklik vir hierdie projek geskryf", "MIT (projeklisensie)", "Ja", "Nee", "Gebundel"],
  ["Skryfwys-evalueringsinne", "Oorspronklike toetsdata", "MIT (projeklisensie)", "Ja", "Nee", "Gebundel"],
  ["Hunspell Afrikaans", "LibreOffice/dictionaries af_ZA, vasgepen", "LGPL 2.1+", "Ja", "Ja", "Vervangbaar gebundel"],
  ["Leipzig-frekwensies", "afr_wikipedia_2021_10K, vasgepen en gefiltreer", "CC BY", "Ja", "Ja", "Slegs rangorde"],
  ["LanguageTool Afrikaans", "Adapter beplan na tegniese en lisensiehersiening", "Nie vasgestel nie", "Onbekend", "Onbekend", "Nie gebundel nie"],
  ["HAT / WAT", "Slegs met ’n toekomstige lisensie-ooreenkoms", "Eiendomsregtelik", "Lisensie nodig", "Volgens lisensie", "Nie gebundel nie"],
];

export function SourcesPage() {
  return <div className="sources-page page-stack"><PageIntro eyebrow="Deursigtige herkoms" title="Databronne & lisensies" description="Elke taalbron moet ’n bekende oorsprong en gebruiksreg hê. Onsekere of kopieregbeskermde woordeboekdata word nie stilweg ingesluit nie." />
    <div className="licence-summary"><div className="summary-stat"><strong>4</strong><span>gedokumenteerde bronne gebundel</span></div><div className="summary-stat"><strong>0</strong><span>HAT- of WAT-inskrywings gekopieer</span></div><div className="summary-stat"><strong>2</strong><span>toekomstige adapters, data uitgesluit</span></div></div>
    <section className="card source-table-card"><div className="section-heading"><div><span className="step-number"><Database size={17} /></span><div><h3>Bronregister</h3><p>Status vir die eerste vrystelling.</p></div></div></div><div className="responsive-table"><table><thead><tr><th>Naam</th><th>Bron</th><th>Lisensie</th><th>Kommersieel</th><th>Erkenning</th><th>Status</th></tr></thead><tbody>{sourceRows.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}>{index === 0 ? <strong>{cell}</strong> : index === 5 ? <span className={`source-status ${cell.includes("Gebundel") ? "bundled" : "excluded"}`}>{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div></section>
    <div className="licence-principles"><article className="card"><ShieldCheck /><h3>Geen stille aflaaie</h3><p>’n Eksterne lys word eers gebruik nadat bron, lisensie, kommersiële gebruik en erkenning bevestig is.</p></article><article className="card"><Code2 /><h3>Adapters hou grense skoon</h3><p>Gelisensieerde bronne bly vervangbare datalêers of afsonderlike adapters, nie versteekte kernlogika nie.</p></article><article className="card"><BookOpenCheck /><h3>Geen uitgedinkte definisies</h3><p>Wanneer geen gemagtigde betekenisbron beskikbaar is nie, sê die woordhelper dit duidelik.</p></article></div>
  </div>;
}

export function AboutPage() {
  return <div className="about-page page-stack"><section className="about-hero card"><div className="about-mark"><Sparkles /></div><span className="page-eyebrow">Beta · eerste vertikale snit</span><h2>Afrikaans, mooi gestel.</h2><p>Skryfwys is ’n privaatheidsbewuste skryfassistent wat betroubare, deterministiese taalreëls eerste stel en KI slegs as ’n opsionele, sigbare laag gebruik.</p><div className="about-values"><span><ShieldCheck />Privaat by verstek</span><span><Languages />Afrikaans eerste</span><span><Gauge />Meetbare gehalte</span></div></section>
    <div className="about-grid"><article className="card"><Heart /><h3>Waarom Skryfwys?</h3><p>Afrikaanse skrywers verdien gereedskap wat samestellings, register, plaaslike gebruik en vaktaal verstaan—sonder om akkuraatheid voor te gee wat nog nie gemeet is nie.</p></article><article className="card"><Sparkles /><h3>Wat werk nou?</h3><p>Die webredigeerder, veilige regstellings, persoonlike terme, bronbewuste woordhulp en ’n deterministiese herskryfpad vorm die eerste vrystelling.</p></article><article className="card"><Globe2 /><h3>Wat volg?</h3><p>Breër gelisensieerde woorddekking, beter morfologie, ’n gestruktureerde KI-poort en hergebruik in blaaier-, Office- en iOS-integrasies.</p></article></div>
    <section className="card honest-status"><div><span className="page-eyebrow">Eerlike status</span><h3>Dit is nie nog Grammarly-vlak akkuraatheid nie.</h3><p>Die saadwoordelys is doelbewus klein en die grammatika-reëls konserwatief. Elke uitbreiding moet deur die evalueringsdatastel en lisensiebeleid gaan.</p></div><AlertTriangle size={34} /></section>
    <footer className="about-footer"><span>Skryfwys v0.1.0</span><span>Gebou met React, TypeScript en FastAPI</span><span>Oop, bronbewuste taalargitektuur</span></footer>
  </div>;
}

export function DiagnosticsPage({ health, diagnostics, onRefresh, lastCheckMs }: { health: ApiHealth; diagnostics: Record<string, unknown> | null; onRefresh: () => Promise<void>; lastCheckMs?: number }) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } };
  const secureContext = window.isSecureContext || window.location.hostname === "localhost";
  return <div className="diagnostics-page page-stack"><PageIntro eyebrow="Stelselstatus" title="Diagnostiek" description="Gaan die plaaslike webkliënt, API en taal-enjin na sonder om jou dokumentteks in die verslag te wys." action={<button className="secondary-button" type="button" onClick={refresh} disabled={refreshing}>{refreshing ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}Toets weer</button>} />
    <div className={`diagnostic-hero card ${health.status}`}><span className="diagnostic-hero-icon">{health.status === "online" ? <CheckCircle2 /> : health.status === "checking" ? <LoaderCircle className="spin" /> : <WifiOff />}</span><div><span>Skryfwys-diens</span><h3>{health.status === "online" ? "Die API is bereikbaar" : health.status === "checking" ? "Toets verbinding…" : "API vanlyn — blaaierdemo beskikbaar"}</h3><p>{health.detail ?? (health.apiPath ? `Verbind deur ${health.apiPath}` : "Die webkliënt gebruik die gekonfigureerde API.")}</p></div><span className={`health-pill ${health.status}`}>{health.status === "online" ? "Aanlyn" : health.status === "checking" ? "Toets" : "Vanlyn"}</span></div>
    <div className="diagnostic-grid">
      <article className="diagnostic-card card"><div className="diagnostic-label"><Server size={18} />API</div><dl><div><dt>Status</dt><dd>{health.status}</dd></div><div><dt>Pad</dt><dd>{health.apiPath ?? "—"}</dd></div><div><dt>Weergawe</dt><dd>{health.version ?? String(diagnostics?.version ?? "—")}</dd></div><div><dt>Laas getoets</dt><dd>{health.checkedAt ? new Date(health.checkedAt).toLocaleTimeString("af-ZA") : "—"}</dd></div></dl></article>
      <article className="diagnostic-card card"><div className="diagnostic-label"><Activity size={18} />Taal-enjin</div><dl><div><dt>Enjin</dt><dd>{health.engine ?? String(diagnostics?.deterministic_engine ?? "deterministies")}</dd></div><div><dt>Laaste kontrole</dt><dd>{lastCheckMs !== undefined ? `${lastCheckMs} ms` : "Nog nie getoets nie"}</dd></div><div><dt>Wolk-KI</dt><dd>{String(diagnostics?.ai_provider_configured ?? "nie gerapporteer nie")}</dd></div><div><dt>Rou teks in log</dt><dd>Nee (beleid)</dd></div></dl></article>
      <article className="diagnostic-card card"><div className="diagnostic-label"><Laptop size={18} />Webkliënt</div><dl><div><dt>Weergawe</dt><dd>0.1.0</dd></div><div><dt>Aanlyn</dt><dd>{navigator.onLine ? "Ja" : "Nee"}</dd></div><div><dt>Veilige konteks</dt><dd>{secureContext ? "Ja" : "Nee"}</dd></div><div><dt>Dienswerker</dt><dd>{"serviceWorker" in navigator ? "Ondersteun" : "Nie ondersteun nie"}</dd></div></dl></article>
      <article className="diagnostic-card card"><div className="diagnostic-label"><HardDrive size={18} />Plaaslike berging</div><dl><div><dt>Beskikbaar</dt><dd>{typeof localStorage !== "undefined" ? "Ja" : "Nee"}</dd></div><div><dt>Dokumente gestoor</dt><dd>Net indien geskiedenis aangeskakel is</dd></div><div><dt>Sleutels</dt><dd>{localStorage.length}</dd></div><div><dt>Ruwe dokument in verslag</dt><dd>Nee</dd></div></dl></article>
    </div>
    {diagnostics && <details className="raw-diagnostics card"><summary><Code2 size={17} />Tegniese metadata <ChevronRight size={15} /></summary><pre>{JSON.stringify(diagnostics, null, 2)}</pre></details>}
    <div className="inline-banner info-banner"><Info size={18} /><span>Diagnostiek bevat slegs operasionele metadata. Dit wys of stuur nie die teks in jou redigeerder nie.</span></div>
  </div>;
}
