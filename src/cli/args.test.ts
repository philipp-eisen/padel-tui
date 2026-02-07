import { describe, expect, test } from "bun:test";
import { parseArgs } from "./args";

describe("parseArgs", () => {
  test("parses positional arguments", () => {
    const result = parseArgs(["availability", "search", "berlin"]);
    expect(result.positional).toEqual(["availability", "search", "berlin"]);
    expect(result.flags).toEqual({});
  });

  test("parses keyed flags with values", () => {
    const result = parseArgs([
      "berlin",
      "--date",
      "2026-02-07",
      "--max-tenants",
      "3",
      "--verbose",
    ]);

    expect(result.positional).toEqual(["berlin"]);
    expect(result.flags).toEqual({
      date: "2026-02-07",
      "max-tenants": "3",
      verbose: true,
    });
  });
});
