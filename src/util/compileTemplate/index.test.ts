import { describe, expect, test } from "vitest";
import { compileTemplate } from "./";

describe("compileTemplate()", () => {
  test("string transforms work", () => {
    expect(
      compileTemplate("${0:toUpperCase():trim()}")(["  Hello world! "])
    ).toBe("HELLO WORLD!");
    expect(compileTemplate("${0:slice(0, -1)}")(["Hello world!"])).toBe(
      "Hello world"
    );
    expect(compileTemplate("${0:slice(0, 6.0):trim()}")(["Hello world!"])).toBe(
      "Hello"
    );
    expect(compileTemplate("${0:replace(/\\|/, '_')}")(["A|B|C"])).toBe(
      "A_B|C"
    );
    expect(compileTemplate("${0:replace(/\\|/g, '_')}")(["A|B|C"])).toBe(
      "A_B_C"
    );
  });

  test("number transforms work", () => {
    expect(compileTemplate("${0:ceil()}")(["19.728"])).toBe("20");
    expect(compileTemplate("${0:floor():toFixed(2)}")(["19.728"])).toBe(
      "19.00"
    );
  });

  test("number transforms work with explicit variable positioning", () => {
    expect(compileTemplate("${0:min(0, _, 1, 2)}")(["-10"])).toBe("-10");
    expect(compileTemplate("${0:min(0, 1, 2)}")(["-10"])).toBe("0");
  });

  test("escape characters are respected", () => {
    expect(compileTemplate("${0:replace(/\\//, '\\'Hello\\'')}")(["/"])).toBe(
      "'Hello'"
    );
  });

  test("match index with no braces works", () => {
    expect(compileTemplate("$0")(["yes"])).toBe("yes");
    expect(compileTemplate(" $0")(["yes"])).toBe(" yes");
    expect(compileTemplate(" $0 ")(["yes"])).toBe(" yes ");
  });

  test("colons can be used in strings", () => {
    expect(compileTemplate("${0:replace(/l/, ':')}")(["ll"])).toBe(":l");
  });

  // TODO
  // test("throws for malformed strings", () => {
  //   expect(() => compileTemplate("${lineNumber:toFixed(2")).toThrow(
  //     "Failed to parse expressions"
  //   );
  // });
});
