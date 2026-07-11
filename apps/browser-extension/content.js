(function initializeContentScript() {
  "use strict";

  const safety = globalThis.SkryfwysSafety;
  if (!safety || globalThis.__SKRYFWYS_CONTENT_LOADED__) return;
  globalThis.__SKRYFWYS_CONTENT_LOADED__ = true;

  let settings = null;
  let activeEditable = null;
  let host = null;
  let shadow = null;
  let floatingButton = null;
  let panel = null;

  function describeElement(element) {
    const form = element.closest ? element.closest("form") : null;
    return {
      tagName: element.tagName,
      type: element.getAttribute ? element.getAttribute("type") || element.type : "",
      autocomplete: element.getAttribute ? element.getAttribute("autocomplete") : "",
      name: element.getAttribute ? element.getAttribute("name") : "",
      id: element.id,
      ariaLabel: element.getAttribute ? element.getAttribute("aria-label") : "",
      placeholder: element.getAttribute ? element.getAttribute("placeholder") : "",
      formAction: form ? form.getAttribute("action") : "",
      formLabel: form ? `${form.getAttribute("aria-label") || ""} ${form.id || ""} ${form.className || ""}` : ""
    };
  }

  function editableRoot(candidate) {
    if (!(candidate instanceof Element)) return null;
    const input = candidate.closest("input, textarea");
    if (input) {
      if (input.disabled || input.readOnly || safety.isSensitiveFieldDescriptor(describeElement(input))) return null;
      return input;
    }
    const contenteditable = candidate.closest("[contenteditable]:not([contenteditable='false'])");
    if (!contenteditable || contenteditable.getAttribute("aria-disabled") === "true") return null;
    if (safety.isSensitiveFieldDescriptor(describeElement(contenteditable))) return null;
    const secureForm = contenteditable.closest("form");
    if (secureForm && secureForm.querySelector("input[type='password'], [autocomplete^='cc-'], [autocomplete='one-time-code']")) return null;
    return contenteditable;
  }

  function currentOriginAllowed() {
    return Boolean(settings && settings.enabled && !safety.isOriginExcluded(location.origin, settings.excludedOrigins));
  }

  function ensureUi() {
    if (host && host.isConnected) return;
    host = document.createElement("div");
    host.id = "skryfwys-extension-root";
    host.style.all = "initial";
    shadow = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      button { font: 600 13px/1.2 system-ui, sans-serif; }
      .sk-button { position: fixed; z-index: 2147483646; width: 38px; height: 38px; border: 2px solid #fff;
        border-radius: 999px; color: #fff; background: #176b5b; box-shadow: 0 3px 14px rgba(0,0,0,.28);
        cursor: pointer; display: none; }
      .sk-button:focus-visible, .close:focus-visible, .suggestion:focus-visible { outline: 3px solid #f5bd32; outline-offset: 2px; }
      .panel { position: fixed; z-index: 2147483647; right: 18px; top: 18px; width: min(370px, calc(100vw - 36px));
        max-height: calc(100vh - 36px); overflow: auto; border: 1px solid #c9d8d4; border-radius: 14px;
        color: #172521; background: #fff; box-shadow: 0 14px 42px rgba(0,0,0,.3); font: 14px/1.45 system-ui, sans-serif; display: none; }
      .panel-header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between;
        padding: 12px 14px; color: #fff; background: #174f46; }
      .panel-header strong { font-size: 16px; }
      .close { width: 34px; height: 34px; border: 0; border-radius: 8px; color: #fff; background: transparent; cursor: pointer; font-size: 20px; }
      .body { padding: 14px; }
      .status { margin: 0; color: #40534e; }
      .issue { padding: 12px 0; border-bottom: 1px solid #e3ebe8; }
      .issue:last-child { border: 0; }
      .meta { color: #526660; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
      .message { margin: 5px 0 8px; }
      .original { padding: 2px 5px; border-radius: 4px; background: #fff0ed; font-family: ui-monospace, monospace; }
      .suggestions { display: flex; flex-wrap: wrap; gap: 7px; }
      .suggestion { min-height: 36px; padding: 7px 10px; border: 1px solid #176b5b; border-radius: 8px;
        color: #124d43; background: #f1faf7; cursor: pointer; }
      .error { color: #8d251d; }
    `;
    shadow.append(style);

    floatingButton = document.createElement("button");
    floatingButton.className = "sk-button";
    floatingButton.type = "button";
    floatingButton.textContent = "Sk";
    floatingButton.setAttribute("aria-label", "Kontroleer hierdie teks met Skryfwys");
    floatingButton.addEventListener("click", () => checkActive());
    shadow.append(floatingButton);

    panel = document.createElement("section");
    panel.className = "panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Skryfwys-voorstelle");
    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("strong");
    title.textContent = "Skryfwys";
    const close = document.createElement("button");
    close.className = "close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Maak voorstelle toe");
    close.addEventListener("click", hidePanel);
    header.append(title, close);
    const body = document.createElement("div");
    body.className = "body";
    panel.append(header, body);
    shadow.append(panel);
    document.documentElement.append(host);
  }

  function hidePanel() {
    if (panel) panel.style.display = "none";
  }

  function renderStatus(message, isError) {
    ensureUi();
    const body = panel.querySelector(".body");
    body.replaceChildren();
    const status = document.createElement("p");
    status.className = isError ? "status error" : "status";
    status.textContent = message;
    body.append(status);
    panel.style.display = "block";
  }

  function positionButton() {
    if (!floatingButton || !activeEditable || !activeEditable.isConnected || !currentOriginAllowed()) {
      if (floatingButton) floatingButton.style.display = "none";
      return;
    }
    const rectangle = activeEditable.getBoundingClientRect();
    if (rectangle.width < 40 || rectangle.height < 24 || rectangle.bottom < 0 || rectangle.top > innerHeight) {
      floatingButton.style.display = "none";
      return;
    }
    floatingButton.style.left = `${Math.max(4, Math.min(innerWidth - 42, rectangle.right - 42))}px`;
    floatingButton.style.top = `${Math.max(4, Math.min(innerHeight - 42, rectangle.bottom - 42))}px`;
    floatingButton.style.display = "block";
  }

  function fieldText(element) {
    return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
      ? element.value
      : (element.textContent || "");
  }

  function captureContext() {
    const element = activeEditable && activeEditable.isConnected ? activeEditable : editableRoot(document.activeElement);
    if (element) {
      const fullText = fieldText(element);
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        const start = Number.isInteger(element.selectionStart) ? element.selectionStart : 0;
        const end = Number.isInteger(element.selectionEnd) ? element.selectionEnd : fullText.length;
        const hasSelection = end > start;
        return {
          kind: "control", element, fullText,
          checkedText: hasSelection ? fullText.slice(start, end) : fullText,
          checkedStartCodeUnit: hasSelection ? start : 0
        };
      }

      const selection = window.getSelection();
      if (selection && selection.rangeCount && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        if (element.contains(range.commonAncestorContainer)) {
          const prefix = range.cloneRange();
          prefix.selectNodeContents(element);
          prefix.setEnd(range.startContainer, range.startOffset);
          return {
            kind: "contenteditable", element, fullText,
            checkedText: range.toString(), checkedStartCodeUnit: prefix.toString().length
          };
        }
      }
      return { kind: "contenteditable", element, fullText, checkedText: fullText, checkedStartCodeUnit: 0 };
    }

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : "";
    return selectedText.trim() ? { kind: "read-only", element: null, fullText: selectedText, checkedText: selectedText, checkedStartCodeUnit: 0 } : null;
  }

  function rangeForTextOffsets(root, start, end) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let position = 0;
    let startNode = null;
    let startOffset = 0;
    let endNode = null;
    let endOffset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const next = position + node.data.length;
      if (!startNode && start >= position && start <= next) {
        startNode = node;
        startOffset = start - position;
      }
      if (end >= position && end <= next) {
        endNode = node;
        endOffset = end - position;
        break;
      }
      position = next;
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  function applySuggestion(context, issue, replacement) {
    if (!context.element || context.kind === "read-only") throw new Error("Hierdie keuse is leesalleen en kan nie outomaties vervang word nie.");
    const range = safety.resolveReplacementRange({
      currentText: fieldText(context.element),
      snapshotText: context.fullText,
      checkedText: context.checkedText,
      checkedStartCodeUnit: context.checkedStartCodeUnit,
      offsetStart: issue.offset_start,
      offsetEnd: issue.offset_end,
      original: issue.original
    });
    if (!range) throw new Error("Die veld het verander of die voorstel se teksposisie is ongeldig. Kontroleer asseblief weer.");
    const { start: absoluteStart, end: absoluteEnd } = range;

    if (context.kind === "control") {
      context.element.focus();
      context.element.setRangeText(replacement, absoluteStart, absoluteEnd, "end");
    } else {
      const domRange = rangeForTextOffsets(context.element, absoluteStart, absoluteEnd);
      if (!domRange) throw new Error("Skryfwys kon nie die presiese teksreeks vind nie.");
      const node = document.createTextNode(replacement);
      domRange.deleteContents();
      domRange.insertNode(node);
      const selection = window.getSelection();
      selection.removeAllRanges();
      const caret = document.createRange();
      caret.setStartAfter(node);
      caret.collapse(true);
      selection.addRange(caret);
    }
    context.element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText", data: replacement }));
  }

  function renderIssues(context, result) {
    ensureUi();
    const body = panel.querySelector(".body");
    body.replaceChildren();
    if (!result.issues.length) {
      const empty = document.createElement("p");
      empty.className = "status";
      empty.textContent = "Geen bekende probleme is in die gekose teks gevind nie.";
      body.append(empty);
    }

    for (const issue of result.issues) {
      const card = document.createElement("article");
      card.className = "issue";
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${issue.type || "voorstel"} · ${issue.rule_id || ""}`;
      const message = document.createElement("p");
      message.className = "message";
      message.textContent = issue.message_af || "Skryfwys het 'n moontlike probleem gevind.";
      const original = document.createElement("span");
      original.className = "original";
      original.textContent = issue.original || "";
      card.append(meta, message, original);

      const suggestions = document.createElement("div");
      suggestions.className = "suggestions";
      for (const suggestion of Array.isArray(issue.suggestions) ? issue.suggestions : []) {
        if (!suggestion || typeof suggestion.text !== "string") continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "suggestion";
        button.textContent = `Vervang met “${suggestion.text}”`;
        button.addEventListener("click", () => {
          try {
            applySuggestion(context, issue, suggestion.text);
            renderStatus("Die regstelling is toegepas. Kontroleer die veld weer vir bygewerkte voorstelle.", false);
          } catch (error) {
            renderStatus(error.message || "Die regstelling kon nie toegepas word nie.", true);
          }
        });
        suggestions.append(button);
      }
      card.append(suggestions);
      body.append(card);
    }
    panel.style.display = "block";
  }

  async function checkActive() {
    if (!currentOriginAllowed()) {
      renderStatus("Skryfwys is vir hierdie webwerf afgeskakel.", true);
      return;
    }
    const context = captureContext();
    if (!context || !context.checkedText.trim()) {
      renderStatus("Kies teks of fokus 'n teksveld voordat jy kontroleer.", true);
      return;
    }
    renderStatus("Kontroleer…", false);
    try {
      const response = await chrome.runtime.sendMessage({ type: "CHECK_TEXT", text: context.checkedText });
      if (!response || !response.ok) throw new Error(response && response.error ? response.error : "Kontrole het misluk.");
      renderIssues(context, response.result);
    } catch (error) {
      renderStatus(error.message || "Die Skryfwys-bediener is nie beskikbaar nie.", true);
    }
  }

  document.addEventListener("focusin", (event) => {
    activeEditable = editableRoot(event.target);
    ensureUi();
    positionButton();
  }, true);
  document.addEventListener("focusout", () => setTimeout(() => {
    if (!editableRoot(document.activeElement)) {
      activeEditable = null;
      positionButton();
    }
  }, 0), true);
  window.addEventListener("scroll", positionButton, true);
  window.addEventListener("resize", positionButton);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "CHECK_ACTIVE") return false;
    checkActive().then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area !== "sync") return;
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((response) => {
      if (response && response.ok) settings = response.settings;
      positionButton();
      if (!currentOriginAllowed()) hidePanel();
    });
  });

  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }).then((response) => {
    if (response && response.ok) settings = response.settings;
    ensureUi();
    activeEditable = editableRoot(document.activeElement);
    positionButton();
  });
})();
