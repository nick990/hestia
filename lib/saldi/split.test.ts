import { describe, expect, it } from "vitest";
import { splitEqual } from "@/lib/saldi/split";

describe("splitEqual", () => {
  it("spezza 90 € in tre parti uguali", () => {
    expect(splitEqual(90, ["nic", "sara", "marco"], "nic")).toEqual([
      { userId: "nic", amount: 30 },
      { userId: "sara", amount: 30 },
      { userId: "marco", amount: 30 },
    ]);
  });

  it("assegna il resto in centesimi a chi ha pagato se è spuntato", () => {
    expect(splitEqual(100, ["nic", "sara", "marco"], "nic")).toEqual([
      { userId: "nic", amount: 33.34 },
      { userId: "sara", amount: 33.33 },
      { userId: "marco", amount: 33.33 },
    ]);
  });

  it("assegna il resto al primo della lista se il pagante non è spuntato", () => {
    expect(splitEqual(100, ["sara", "marco"], "nic")).toEqual([
      { userId: "sara", amount: 50 },
      { userId: "marco", amount: 50 },
    ]);
    expect(splitEqual(10.01, ["sara", "marco"], "nic")).toEqual([
      { userId: "sara", amount: 5.01 },
      { userId: "marco", amount: 5 },
    ]);
  });

  it("un solo partecipante prende tutto", () => {
    expect(splitEqual(80, ["nic"], "nic")).toEqual([
      { userId: "nic", amount: 80 },
    ]);
  });
});
