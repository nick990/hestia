import { describe, expect, it } from "vitest";
import { formatPayerLine } from "@/lib/cashflow/format";

describe("formatPayerLine", () => {
  it("mostra chi ha pagato", () => {
    expect(formatPayerLine("Nic")).toBe("Pagato da Nic");
  });

  it("null se non c'è ripartizione", () => {
    expect(formatPayerLine(null)).toBe(null);
    expect(formatPayerLine("  ")).toBe(null);
  });
});
