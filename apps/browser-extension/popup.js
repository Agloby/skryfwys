"use strict";

const enabled = document.querySelector("#enabled");
const siteEnabled = document.querySelector("#site-enabled");
const privacy = document.querySelector("#privacy");
const status = document.querySelector("#status");
const checkButton = document.querySelector("#check");
let activeTab = null;
let settings = null;
let activeOrigin = null;

function setStatus(message) {
  status.textContent = message || "";
}

async function initialize() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response || !response.ok) throw new Error("Instellings kon nie gelees word nie.");
  settings = response.settings;
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeOrigin = activeTab && activeTab.url ? SkryfwysSafety.normalizeOrigin(activeTab.url) : null;

  enabled.checked = Boolean(settings.enabled);
  siteEnabled.checked = Boolean(activeOrigin && !SkryfwysSafety.isOriginExcluded(activeOrigin, settings.excludedOrigins));
  siteEnabled.disabled = !activeOrigin;
  checkButton.disabled = !settings.enabled || !siteEnabled.checked || !activeTab || activeTab.incognito;
  privacy.textContent = settings.localOnly
    ? "Plaaslik: slegs jou plaaslike/private bediener; geen wolk-KI nie."
    : `Privaatheidsmodus: ${settings.privacyMode}`;
  if (activeTab && activeTab.incognito) setStatus("Skryfwys is nie in privaat vensters beskikbaar nie.");
}

enabled.addEventListener("change", async () => {
  await chrome.storage.sync.set({ enabled: enabled.checked });
  settings.enabled = enabled.checked;
  checkButton.disabled = !enabled.checked || !siteEnabled.checked;
});

siteEnabled.addEventListener("change", async () => {
  if (!activeOrigin) return;
  const excluded = new Set((settings.excludedOrigins || []).map((item) => SkryfwysSafety.normalizeOrigin(item)).filter(Boolean));
  if (siteEnabled.checked) excluded.delete(activeOrigin);
  else excluded.add(activeOrigin);
  settings.excludedOrigins = [...excluded].sort();
  await chrome.storage.sync.set({ excludedOrigins: settings.excludedOrigins });
  checkButton.disabled = !settings.enabled || !siteEnabled.checked;
});

checkButton.addEventListener("click", async () => {
  setStatus("");
  try {
    if (!activeTab || !activeTab.id) throw new Error("Geen aktiewe webblad is beskikbaar nie.");
    const response = await chrome.tabs.sendMessage(activeTab.id, { type: "CHECK_ACTIVE" });
    if (!response || !response.ok) throw new Error(response && response.error ? response.error : "Die veld kon nie gelees word nie.");
    window.close();
  } catch (error) {
    setStatus(error.message || "Maak eers 'n gewone webblad oop en fokus 'n teksveld.");
  }
});

document.querySelector("#editor").addEventListener("click", async () => {
  const url = settings && SkryfwysSafety.normalizeOrigin(settings.editorUrl) ? settings.editorUrl : "http://localhost:5173";
  await chrome.tabs.create({ url });
});
document.querySelector("#options").addEventListener("click", () => chrome.runtime.openOptionsPage());

initialize().catch((error) => setStatus(error.message));

