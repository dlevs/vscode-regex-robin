import { describe, expect, test } from "vitest";
import { replaceMatches } from "./stringUtils";

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

  // This one is not necessarily correct, but it's what we have now
  // and seems reasonable. We can extend escape sequences later if needed.
  test("only groups 0-9 are valid variables", () => {
    expect(replaceMatches("$0-$1-$10-$21", [])).toBe("--0-1");
  });
});
