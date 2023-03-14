import { describe, expect, test, vi } from "vitest";
import { Position, Range, Uri } from "vscode";
import { compileTemplate } from ".";
import { DocumentMatch } from "../util/documentUtils";

vi.mock("vscode");

describe("compileTemplate()", () => {
  test("string transforms work", () => {
    expect(
      compileTemplate("${$0.toUpperCase().trim()}")(expand(" Hello world! "))
    ).toBe("HELLO WORLD!");
    expect(compileTemplate("${$0.slice(0, -1)}")(expand("Hello world!"))).toBe(
      "Hello world"
    );
    expect(
      compileTemplate("${$0.slice(0, 6.0).trim()}")(expand("Hello world!"))
    ).toBe("Hello");
    expect(compileTemplate("${$0.replace(/\\|/, '_')}")(expand("A|B|C"))).toBe(
      "A_B|C"
    );
    expect(compileTemplate("${$0.replace(/\\|/g, '_')}")(expand("A|B|C"))).toBe(
      "A_B_C"
    );
  });

  test("escape characters are respected", () => {
    expect(
      compileTemplate("${$0.replace(/\\//, '\\'Hello\\'')}")(expand("/"))
    ).toBe("'Hello'");
  });

  test("match index with no braces works", () => {
    expect(compileTemplate("$0")(expand("yes"))).toBe("yes");
    expect(compileTemplate(" $0")(expand("yes"))).toBe(" yes");
    expect(compileTemplate(" $0 ")(expand("yes"))).toBe(" yes ");
  });

  test("colons can be used in strings", () => {
    expect(compileTemplate("${$0.replace(/l/, ':')}")(expand("ll"))).toBe(":l");
  });

  test("gracefully handles syntax errors", () => {
    expect(compileTemplate("OK ${lineNumber.toFixed(2")(expand("foo"))).toBe(
      "OK [ERROR: missing ) after argument list]"
    );
  });
});

function expand(...matchGroups: string[]): DocumentMatch {
  return {
    documentUri: Uri.parse("file:///foo/bar"),
    rule: {} as any,
    matchGroups: matchGroups.map((match) => ({
      match,
      range: new Range(new Position(0, 0), new Position(0, 0)),
    })) as DocumentMatch["matchGroups"],
  };
}
