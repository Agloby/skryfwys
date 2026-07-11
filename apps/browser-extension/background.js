"use strict";

importScripts("lib/safety.js");

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  localOnly: true,
  privacyMode: "local",
  documentMode: "general",
  apiBaseUrl: "http://127.0.0.1:8000",
  editorUrl: "http://localhost:5173",
  excludedOrigins: []
});

const ALLOWED_PRIVACY_MODES = new Set(["local", "private-server", "cloud-ai"]);
const ALLOWED_DOCUMENT_MODES = new Set(["general", "formal", "informal", "academic", "professional"]);
const MAX_INPUT_CHARACTERS = 50_000;
const REQUEST_TIMEOUT_MS = 20_000;

async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    excludedOrigins: Array.isArray(stored.excludedOrigins) ? stored.excludedOrigins : []
  };
}

function sanitizedBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Slegs HTTP- of HTTPS-bedieners word ondersteun.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function validateCheckResponse(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.issues)) {
    throw new Error("Die bediener se antwoord het nie die verwagte formaat nie.");
  }
  return payload;
}

async function checkText(text, sender) {
  if (sender.tab && sender.tab.incognito) {
    throw new Error("Skryfwys werk nie in privaat vensters nie.");
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Kies of tik eers teks om te kontroleer.");
  }
  if (Array.from(text).length > MAX_INPUT_CHARACTERS) {
    throw new Error(`Die gekose teks is langer as ${MAX_INPUT_CHARACTERS.toLocaleString("af-ZA")} karakters.`);
  }

  const settings = await getSettings();
  if (!settings.enabled) throw new Error("Skryfwys is tans afgeskakel.");
  const apiBaseUrl = sanitizedBaseUrl(settings.apiBaseUrl);
  if (settings.localOnly && !SkryfwysSafety.isPrivateApiUrl(apiBaseUrl)) {
    throw new Error("Plaaslike modus laat slegs 'n plaaslike of private-netwerkbediener toe.");
  }

  const privacyMode = settings.localOnly
    ? "local"
    : (ALLOWED_PRIVACY_MODES.has(settings.privacyMode) ? settings.privacyMode : "local");
  const documentMode = ALLOWED_DOCUMENT_MODES.has(settings.documentMode)
    ? settings.documentMode
    : "general";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${apiBaseUrl}/api/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ text, privacy_mode: privacyMode, document_mode: documentMode }),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: controller.signal
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => null);
      const detail = problem && typeof problem.detail === "string" ? `: ${problem.detail}` : "";
      throw new Error(`Die bediener het HTTP ${response.status} teruggestuur${detail}`);
    }
    return validateCheckResponse(await response.json());
  } catch (error) {
    if (error && error.name === "AbortError") throw new Error("Die kontrole het te lank geneem.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  const missing = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (typeof existing[key] === "undefined") missing[key] = value;
  }
  if (Object.keys(missing).length) await chrome.storage.sync.set(missing);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return false;

  if (message.type === "GET_SETTINGS") {
    getSettings().then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "CHECK_TEXT") {
    checkText(message.text, sender).then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Kontrole het misluk." }));
    return true;
  }
  return false;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "check-current-field") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || tab.incognito) return;
  chrome.tabs.sendMessage(tab.id, { type: "CHECK_ACTIVE" }).catch(() => undefined);
});

