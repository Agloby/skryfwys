import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#editor";
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
});

afterEach(() => vi.restoreAllMocks());

describe("Skryfwys application", () => {
  it("falls back transparently to the limited local checker", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Kontroleer teks/ }));
    expect(await screen.findByText(/Plaaslike blaaierontleding/)).toBeInTheDocument();
    expect(screen.getByText(/hoëvertroue/)).toBeInTheDocument();
  });

  it("accepts all safe deterministic suggestions and records undo history", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /^Kontroleer teks/ }));
    const acceptAll = await screen.findByRole("button", { name: /Aanvaar veilige voorstelle/ });
    await user.click(acceptAll);
    const editor = screen.getByRole("textbox", { name: "Afrikaanse teks" });
    await waitFor(() => expect((editor as HTMLTextAreaElement).value).toContain("hoeveelheidsopmeter"));
    expect((editor as HTMLTextAreaElement).value).toContain("voltooi");
    expect(screen.getByRole("button", { name: "Ontdoen" })).toBeEnabled();
  });

  it("navigates with accessible page state and switches the primary UI language", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Switch to English" }));
    expect(screen.getByRole("heading", { name: "Editor" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Privacy" }));
    expect(screen.getByRole("heading", { name: "Jy besluit waar jou teks gaan" })).toBeInTheDocument();
  });
});
