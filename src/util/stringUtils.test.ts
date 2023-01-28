import { describe, expect, test, vi } from "vitest";
import { replaceMatches } from "./stringUtils";

vi.mock("vscode");

describe("replaceMatches()", () => {
  test("replacing variables", () => {
    expect(replaceMatches("Hello $0", [{ match: "Clara" }])).toBe(
      "Hello Clara"
    );
    expect(
      replaceMatches("Hello $1", [{ match: "Clara" }, { match: "you" }])
    ).toBe("Hello you");
  });

  test("missing variables get replaced with nothing", () => {
    expect(replaceMatches("Hello $0", [])).toBe("Hello ");
  });

  test("variable at start / end / immediately after others are replaced", () => {
    expect(
      replaceMatches("Hello $1$2.$3", [
        { match: "Clara" },
        { match: "A" },
        { match: "B" },
        { match: "C" },
      ])
    ).toBe("Hello AB.C");
    expect(
      replaceMatches("$0$1$2$3", [
        { match: "AB" },
        { match: "A" },
        { match: "B" },
      ])
    ).toBe("ABAB");
  });

  test("variables can be escaped", () => {
    expect(
      replaceMatches("$0 has \\$20, which is +\\$10 more than yesterday", [
        { match: "Gary" },
      ])
    ).toBe("Gary has $20, which is +$10 more than yesterday");
  });

  test("curly bracket syntax works", () => {
    expect(replaceMatches("0${1}3", [{ match: "AB" }, { match: "A" }])).toBe(
      "0A3"
    );
  });

  test("multi-digit capture groups work", () => {
    expect(
      replaceMatches(
        "$0-$1-$10-$21-${10}0",
        Array.from({ length: 100 }).map((_, i) => ({ match: String(i) }))
      )
    ).toBe("0-1-10-21-100");
  });

  // TODO: Extract this, and move to a different test / `description` block
  test("string transforms work", () => {
    expect(
      replaceMatches("${0:toUpperCase():trim()}", [
        { match: "  Hello world! " },
      ])
    ).toBe("HELLO WORLD!");
    expect(
      replaceMatches("${0:slice(0, -1)}", [{ match: "Hello world!" }])
    ).toBe("Hello world");
    expect(
      replaceMatches("${0:slice(0, +6.0):trim()}", [{ match: "Hello world!" }])
    ).toBe("Hello");
    expect(
      replaceMatches("${0:replace(/\\|/, '_')}", [{ match: "A|B|C" }])
    ).toBe("A_B|C");
    expect(
      replaceMatches("${0:replace(/\\|/g, '_')}", [{ match: "A|B|C" }])
    ).toBe("A_B_C");
  });

  test("number transforms work", () => {
    expect(replaceMatches("${0:ceil()}", [{ match: "19.728" }])).toBe("20");
    expect(
      replaceMatches("${0:floor():toFixed(2)}", [{ match: "19.728" }])
    ).toBe("19.00");
  });

  test("number transforms work with explicit variable positioning", () => {
    expect(replaceMatches("${0:min(0, _, 1, 2)}", [{ match: "-10" }])).toBe(
      "-10"
    );
    expect(replaceMatches("${0:min(0, 1, 2)}", [{ match: "-10" }])).toBe("0");
  });
});
