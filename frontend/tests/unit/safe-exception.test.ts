import { describe, expect, it } from "vitest";
import { safeExceptionCategory } from "../support/safe-exception";

describe("clasificación de excepciones sin datos originales", () => {
  it("devuelve exclusivamente categorías estáticas", () => {
    expect(safeExceptionCategory(new TypeError("synthetic private input"))).toBe("typeerror");
    expect(safeExceptionCategory(new Error("strict mode violation: synthetic private locator"))).toBe("strictmode");
    expect(safeExceptionCategory(new Error("page.goto: net::ERR_FAILED synthetic private URL"))).toBe("navigation");
    expect(safeExceptionCategory(new Error("expect(locator).toContainText synthetic private input"))).toBe("assertion");
    expect(safeExceptionCategory(new Error("synthetic private input"))).toBe("unknown");
    expect(safeExceptionCategory("synthetic private input")).toBe("unknown");
  });
});
