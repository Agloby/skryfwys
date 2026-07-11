const test = require("node:test");
const assert = require("node:assert/strict");
const safety = require("../lib/safety.js");

test("normalizes only HTTP origins", () => {
  assert.equal(safety.normalizeOrigin("HTTPS://Voorbeeld.co.za/pad?q=1"), "https://voorbeeld.co.za");
  assert.equal(safety.normalizeOrigin("file:///tmp/private.txt"), null);
  assert.equal(safety.normalizeOrigin("not a url"), null);
});

test("local-only URL guard accepts loopback and private networks", () => {
  for (const url of [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://10.2.3.4",
    "https://172.20.0.5",
    "https://192.168.1.20",
    "https://skryfwys.local"
  ]) assert.equal(safety.isPrivateApiUrl(url), true, url);
  assert.equal(safety.isPrivateApiUrl("https://api.example.com"), false);
  assert.equal(safety.isPrivateApiUrl("file:///tmp/socket"), false);
});

test("exclusions compare normalized origins rather than paths", () => {
  assert.equal(safety.isOriginExcluded("https://Example.com/editor", ["https://example.com/account"]), true);
  assert.equal(safety.isOriginExcluded("https://example.net", ["https://example.com"]), false);
  assert.equal(safety.isOriginExcluded("chrome://settings", []), true);
});

test("sensitive descriptors reject credentials and payment metadata", () => {
  assert.equal(safety.isSensitiveFieldDescriptor({ tagName: "input", type: "password" }), true);
  assert.equal(safety.isSensitiveFieldDescriptor({ tagName: "input", type: "text", autocomplete: "cc-number" }), true);
  assert.equal(safety.isSensitiveFieldDescriptor({ tagName: "textarea", ariaLabel: "Kredietkaart besonderhede" }), true);
  assert.equal(safety.isSensitiveFieldDescriptor({ tagName: "input", type: "text", name: "project-description" }), false);
  assert.equal(safety.isSensitiveFieldDescriptor({ tagName: "textarea", placeholder: "Tik jou paragraaf" }), false);
});

test("converts API code-point offsets to JavaScript UTF-16 offsets", () => {
  const text = "A😀môre";
  assert.equal(safety.codePointOffsetToCodeUnitIndex(text, 0), 0);
  assert.equal(safety.codePointOffsetToCodeUnitIndex(text, 2), 3);
  assert.equal(safety.codePointOffsetToCodeUnitIndex(text, 6), 7);
  assert.equal(safety.codePointOffsetToCodeUnitIndex(text, 7), -1);
});

test("rejects stale snapshots before resolving a replacement range", () => {
  const base = {
    snapshotText: "😀 Die môree.",
    checkedText: "Die môree",
    checkedStartCodeUnit: 3,
    offsetStart: 4,
    offsetEnd: 9,
    original: "môree"
  };
  assert.deepEqual(safety.resolveReplacementRange({ ...base, currentText: base.snapshotText }), { start: 7, end: 12 });
  assert.equal(safety.resolveReplacementRange({ ...base, currentText: "😀 Die môre." }), null);
  assert.equal(safety.resolveReplacementRange({ ...base, currentText: base.snapshotText, original: "ander" }), null);
});
