import { SkryfwysApiClient } from "./api-client";
import type { CheckResponse, DocumentMode, Issue, PrivacyMode } from "./contracts";
import { createHostAdapter, type HostAdapter } from "./host-adapter";

const elements = {
  check: document.querySelector<HTMLButtonElement>("#check")!,
  status: document.querySelector<HTMLElement>("#status")!,
  results: document.querySelector<HTMLElement>("#results")!,
  host: document.querySelector<HTMLElement>("#host-name")!,
  apiUrl: document.querySelector<HTMLInputElement>("#api-url")!,
  privacyMode: document.querySelector<HTMLSelectElement>("#privacy-mode")!,
  documentMode: document.querySelector<HTMLSelectElement>("#document-mode")!,
  saveSettings: document.querySelector<HTMLButtonElement>("#save-settings")!,
  cloudNotice: document.querySelector<HTMLElement>("#cloud-notice")!,
  cloudConsent: document.querySelector<HTMLInputElement>("#cloud-consent")!
};

let adapter: HostAdapter | null = null;
let checkedSelection = "";
let result: CheckResponse | null = null;

function setStatus(message: string, error = false): void {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", error);
}

function apiClient(): SkryfwysApiClient {
  return new SkryfwysApiClient(elements.apiUrl.value.trim());
}

function loadSettings(): void {
  elements.apiUrl.value = localStorage.getItem("skryfwys.office.apiBaseUrl") || "";
  elements.privacyMode.value = localStorage.getItem("skryfwys.office.privacyMode") || "local";
  elements.documentMode.value = localStorage.getItem("skryfwys.office.documentMode") || "general";
  updateCloudNotice();
}

function updateCloudNotice(): void {
  const cloudSelected = elements.privacyMode.value === "cloud-ai";
  elements.cloudNotice.hidden = !cloudSelected;
  if (!cloudSelected) elements.cloudConsent.checked = false;
}

function saveSettings(): void {
  const baseUrl = elements.apiUrl.value.trim().replace(/\/$/, "");
  if (baseUrl && !baseUrl.startsWith("https://")) {
    setStatus("'n Afsonderlike API-adres moet HTTPS gebruik. Laat dit leeg vir die plaaslike ontwikkelingsinstaanbediener.", true);
    return;
  }
  localStorage.setItem("skryfwys.office.apiBaseUrl", baseUrl);
  localStorage.setItem("skryfwys.office.privacyMode", elements.privacyMode.value);
  localStorage.setItem("skryfwys.office.documentMode", elements.documentMode.value);
  setStatus("Instellings is op hierdie toestel gestoor.");
}

function renderResults(): void {
  elements.results.replaceChildren();
  if (!result || result.issues.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Geen bekende probleme is in die keuse gevind nie.";
    elements.results.append(empty);
    return;
  }

  for (const issue of result.issues) elements.results.append(renderIssue(issue));
}

function renderIssue(issue: Issue): HTMLElement {
  const article = document.createElement("article");
  article.className = `issue severity-${issue.severity}`;
  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${issue.type} · ${issue.rule_id}`;
  const message = document.createElement("p");
  message.textContent = issue.message_af;
  const original = document.createElement("code");
  original.textContent = issue.original;
  const suggestions = document.createElement("div");
  suggestions.className = "suggestions";

  for (const suggestion of issue.suggestions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Vervang met “${suggestion.text}”`;
    button.addEventListener("click", async () => {
      if (!adapter) return;
      setBusy(true);
      try {
        await adapter.applyIssue(checkedSelection, issue, suggestion.text);
        result = null;
        elements.results.replaceChildren();
        setStatus("Die regstelling is toegepas. Kies die teks weer en kontroleer vir nuwe voorstelle.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Die regstelling kon nie toegepas word nie.", true);
      } finally {
        setBusy(false);
      }
    });
    suggestions.append(button);
  }
  article.append(meta, message, original, suggestions);
  return article;
}

function setBusy(busy: boolean): void {
  elements.check.disabled = busy || !adapter;
  elements.saveSettings.disabled = busy;
  for (const button of elements.results.querySelectorAll("button")) button.disabled = busy;
}

async function checkSelection(): Promise<void> {
  if (!adapter) return;
  if (elements.privacyMode.value === "cloud-ai" && !elements.cloudConsent.checked) {
    setStatus("Lees die wolk-KI-kennisgewing en gee uitdruklike toestemming voordat jy kontroleer.", true);
    elements.cloudConsent.focus();
    return;
  }
  setBusy(true);
  setStatus("Lees die huidige keuse…");
  try {
    checkedSelection = await adapter.getSelectedText();
    if (!checkedSelection.trim()) throw new Error("Kies eers teks in die dokument of boodskap.");
    setStatus("Kontroleer…");
    result = await apiClient().check(
      checkedSelection,
      elements.privacyMode.value as PrivacyMode,
      elements.documentMode.value as DocumentMode
    );
    renderResults();
    setStatus(`${result.issue_count} moontlike probleem${result.issue_count === 1 ? "" : "e"} gevind.`);
  } catch (error) {
    result = null;
    elements.results.replaceChildren();
    setStatus(error instanceof Error ? error.message : "Die kontrole kon nie voltooi word nie.", true);
  } finally {
    setBusy(false);
  }
}

elements.check.addEventListener("click", checkSelection);
elements.saveSettings.addEventListener("click", saveSettings);
elements.privacyMode.addEventListener("change", updateCloudNotice);
loadSettings();
setBusy(true);

Office.onReady((info) => {
  try {
    adapter = createHostAdapter(info.host);
    elements.host.textContent = `Gasheer: ${adapter.hostName}`;
    setStatus("Kies teks en kies dan Kontroleer.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Office kon nie begin nie.", true);
  } finally {
    setBusy(false);
  }
});
