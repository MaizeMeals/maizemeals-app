import { describe, expect, it } from "vitest";
import { sanitizeAuthEntryPath, sanitizeAuthNextPath } from "./auth-next-path";

describe("sanitizeAuthNextPath", () => {
  it("keeps an in-app path", () => {
    expect(sanitizeAuthNextPath("/locations/bursley")).toBe("/locations/bursley");
    expect(sanitizeAuthNextPath("  /nutrition  ")).toBe("/nutrition");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeAuthNextPath("//evil.example")).toBe("/");
    expect(sanitizeAuthNextPath("///evil.example/path")).toBe("/");
  });

  it("rejects non-paths", () => {
    expect(sanitizeAuthNextPath("https://evil.example")).toBe("/");
    expect(sanitizeAuthNextPath("locations")).toBe("/");
    expect(sanitizeAuthNextPath("")).toBe("/");
    expect(sanitizeAuthNextPath(null)).toBe("/");
  });

  it("rejects newlines that remain after trim", () => {
    expect(sanitizeAuthNextPath("/ok\nSet-Cookie: x")).toBe("/");
    expect(sanitizeAuthNextPath("/ok\rSet-Cookie: x")).toBe("/");
    expect(sanitizeAuthNextPath("/locations\n/admin")).toBe("/");
  });

  it("rejects overlong strings and keeps a 2048-character path", () => {
    const max = `/${"a".repeat(2047)}`;
    expect(max.length).toBe(2048);
    expect(sanitizeAuthNextPath(max)).toBe(max);
    expect(sanitizeAuthNextPath(`${max}a`)).toBe("/");
  });
});

describe("sanitizeAuthEntryPath", () => {
  it("allows only /login and /signup", () => {
    expect(sanitizeAuthEntryPath("/login")).toBe("/login");
    expect(sanitizeAuthEntryPath("/signup")).toBe("/signup");
    expect(sanitizeAuthEntryPath("  /signup  ")).toBe("/signup");
    expect(sanitizeAuthEntryPath("/signup/extra")).toBe("/login");
    expect(sanitizeAuthEntryPath("//signup")).toBe("/login");
    expect(sanitizeAuthEntryPath("/LOGIN")).toBe("/login");
    expect(sanitizeAuthEntryPath("https://evil.example/signup")).toBe("/login");
    expect(sanitizeAuthEntryPath(null)).toBe("/login");
  });
});
