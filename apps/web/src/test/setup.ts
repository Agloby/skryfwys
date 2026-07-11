import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
});

Object.defineProperty(window, "scrollTo", {
  value: vi.fn(),
  configurable: true,
});

Element.prototype.scrollIntoView = vi.fn();
