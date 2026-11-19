import { describe, expect, it } from "vitest";
import { withSearchParams } from "./redirect-query";

describe("withSearchParams", () => {
  it("adds a query param and keeps the hash", () => {
    expect(withSearchParams("/locations#bursley", { signed_in: "1" })).toBe(
      "/locations?signed_in=1#bursley",
    );
    expect(withSearchParams("/locations?tab=1#bursley", { signed_in: "1" })).toBe(
      "/locations?tab=1&signed_in=1#bursley",
    );
  });

  it("adds a query param when there is no hash", () => {
    expect(withSearchParams("/menus", { signed_in: "1" })).toBe("/menus?signed_in=1");
  });
});
