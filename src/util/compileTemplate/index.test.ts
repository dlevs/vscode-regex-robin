import { describe, expect, test } from "vitest";
import { compileTemplate } from ".";

// TODO: Revisit this file. Some of the tests don't really make sense now that we're just using raw expressions instead of creating a language
describe("compileTemplate()", () => {
  test("string transforms work", () => {
    expect(
      compileTemplate("${$0.toUpperCase().trim()}")(["  Hello world! "])
    ).toBe("HELLO WORLD!");
    expect(compileTemplate("${$0.slice(0, -1)}")(["Hello world!"])).toBe(
      "Hello world"
    );
    expect(
      compileTemplate("${$0.slice(0, 6.0).trim()}")(["Hello world!"])
    ).toBe("Hello");
    expect(compileTemplate("${$0.replace(/\\|/, '_')}")(["A|B|C"])).toBe(
      "A_B|C"
    );
    expect(compileTemplate("${$0.replace(/\\|/g, '_')}")(["A|B|C"])).toBe(
      "A_B_C"
    );
  });

  test("escape characters are respected", () => {
    expect(compileTemplate("${$0.replace(/\\//, '\\'Hello\\'')}")(["/"])).toBe(
      "'Hello'"
    );
  });

  test("match index with no braces works", () => {
    expect(compileTemplate("$0")(["yes"])).toBe("yes");
    expect(compileTemplate(" $0")(["yes"])).toBe(" yes");
    expect(compileTemplate(" $0 ")(["yes"])).toBe(" yes ");
  });

  test("colons can be used in strings", () => {
    expect(compileTemplate("${$0.replace(/l/, ':')}")(["ll"])).toBe(":l");
  });

  // TODO
  // test("throws for malformed strings", () => {
  //   expect(() => compileTemplate("${lineNumber:toFixed(2")).toThrow(
  //     "Failed to parse expressions"
  //   );
  // });
});
