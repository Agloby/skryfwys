(function exposeSafety(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.SkryfwysSafety = api;
})(typeof globalThis === "object" ? globalThis : this, function buildSafety() {
  "use strict";

  const SENSITIVE_AUTOCOMPLETE = /(?:^|\s)(?:current-password|new-password|one-time-code|cc-[\w-]+)(?:\s|$)/i;
  const SENSITIVE_TEXT = /(?:password|passcode|passwd|pwd|wagwoord|pin|otp|one.?time|security.?code|secure|credit.?card|debit.?card|card.?number|kredietkaart|debietkaart|cvv|cvc|kaartnommer|betaal|payment)/i;
  const SAFE_INPUT_TYPES = new Set(["text", "search", "email", "url", "tel"]);

  function normalizeOrigin(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.origin.toLowerCase();
    } catch (_error) {
      return null;
    }
  }

  function isPrivateApiUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch (_error) {
      return false;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
    if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true;
    if (/^10(?:\.\d{1,3}){3}$/.test(host)) return true;
    if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) return true;
    if (/^169\.254(?:\.\d{1,3}){2}$/.test(host)) return true;
    const match172 = /^172\.(\d{1,3})(?:\.\d{1,3}){2}$/.exec(host);
    return Boolean(match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31);
  }

  function isOriginExcluded(origin, excludedOrigins) {
    const normalized = normalizeOrigin(origin);
    if (!normalized) return true;
    return (excludedOrigins || []).some((candidate) => normalizeOrigin(candidate) === normalized);
  }

  function isSensitiveFieldDescriptor(descriptor) {
    const tagName = String(descriptor.tagName || "").toLowerCase();
    const type = String(descriptor.type || "text").toLowerCase();
    if (tagName === "input" && !SAFE_INPUT_TYPES.has(type)) return true;
    if (SENSITIVE_AUTOCOMPLETE.test(String(descriptor.autocomplete || ""))) return true;

    const metadata = [
      descriptor.name,
      descriptor.id,
      descriptor.ariaLabel,
      descriptor.placeholder,
      descriptor.formAction,
      descriptor.formLabel
    ].filter(Boolean).join(" ");
    return SENSITIVE_TEXT.test(metadata);
  }

  function codePointOffsetToCodeUnitIndex(text, offset) {
    if (!Number.isInteger(offset) || offset < 0) return -1;
    const points = Array.from(String(text));
    if (offset > points.length) return -1;
    return points.slice(0, offset).join("").length;
  }

  function resolveReplacementRange(input) {
    if (String(input.currentText) !== String(input.snapshotText)) return null;
    const checkedText = String(input.checkedText);
    const relativeStart = codePointOffsetToCodeUnitIndex(checkedText, input.offsetStart);
    const relativeEnd = codePointOffsetToCodeUnitIndex(checkedText, input.offsetEnd);
    if (relativeStart < 0 || relativeEnd < relativeStart) return null;
    const start = Number(input.checkedStartCodeUnit) + relativeStart;
    const end = Number(input.checkedStartCodeUnit) + relativeEnd;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
    if (String(input.snapshotText).slice(start, end) !== String(input.original)) return null;
    return Object.freeze({ start, end });
  }

  return Object.freeze({
    SAFE_INPUT_TYPES,
    codePointOffsetToCodeUnitIndex,
    isOriginExcluded,
    isPrivateApiUrl,
    isSensitiveFieldDescriptor,
    normalizeOrigin,
    resolveReplacementRange
  });
});
