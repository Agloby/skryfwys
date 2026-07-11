"use strict";

const fields = {
  enabled: document.querySelector("#enabled"),
  localOnly: document.querySelector("#local-only"),
  privacyMode: document.querySelector("#privacy-mode"),
  documentMode: document.querySelector("#document-mode"),
  apiBaseUrl: document.querySelector("#api-url"),
  editorUrl: document.querySelector("#editor-url"),
  excludedOrigins: document.querySelector("#excluded")
};
const status = document.querySelector("#status");

function updatePrivacyControls() {
  fields.privacyMode.disabled = fields.localOnly.checked;
  if (fields.localOnly.checked) fields.privacyMode.value = "local";
}

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!response || !response.ok) throw new Error("Instellings kon nie gelaai word nie.");
  const settings = response.settings;
  fields.enabled.checked = Boolean(settings.enabled);
  fields.localOnly.checked = Boolean(settings.localOnly);
  fields.privacyMode.value = settings.privacyMode;
  fields.documentMode.value = settings.documentMode;
  fields.apiBaseUrl.value = settings.apiBaseUrl;
  fields.editorUrl.value = settings.editorUrl;
  fields.excludedOrigins.value = (settings.excludedOrigins || []).join("\n");
  updatePrivacyControls();
}

fields.localOnly.addEventListener("change", updatePrivacyControls);

document.querySelector("#settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "";
  try {
    const apiOrigin = SkryfwysSafety.normalizeOrigin(fields.apiBaseUrl.value);
    const editorOrigin = SkryfwysSafety.normalizeOrigin(fields.editorUrl.value);
    if (!apiOrigin || !editorOrigin) throw new Error("Gebruik geldige HTTP- of HTTPS-adresse.");
    if (fields.localOnly.checked && !SkryfwysSafety.isPrivateApiUrl(fields.apiBaseUrl.value)) {
      throw new Error("Plaaslike modus vereis 'n loopback-, private-netwerk- of .local API-adres.");
    }

    const permissionPattern = `${apiOrigin}/*`;
    const hasPermission = await chrome.permissions.contains({ origins: [permissionPattern] });
    if (!hasPermission) {
      const granted = await chrome.permissions.request({ origins: [permissionPattern] });
      if (!granted) throw new Error("Die uitbreiding het gasheertoestemming nodig om hierdie API te bereik.");
    }

    const excludedOrigins = fields.excludedOrigins.value.split(/\r?\n/)
      .map((item) => SkryfwysSafety.normalizeOrigin(item.trim()))
      .filter(Boolean);
    await chrome.storage.sync.set({
      enabled: fields.enabled.checked,
      localOnly: fields.localOnly.checked,
      privacyMode: fields.localOnly.checked ? "local" : fields.privacyMode.value,
      documentMode: fields.documentMode.value,
      apiBaseUrl: fields.apiBaseUrl.value.replace(/\/$/, ""),
      editorUrl: fields.editorUrl.value.replace(/\/$/, ""),
      excludedOrigins: [...new Set(excludedOrigins)].sort()
    });
    status.textContent = "Instellings is gestoor.";
  } catch (error) {
    status.textContent = error.message || "Instellings kon nie gestoor word nie.";
  }
});

document.querySelector("#shortcuts").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));
loadSettings().catch((error) => { status.textContent = error.message; });

