import { describe, expect, test, vi } from "vitest";
import { Position, Range, Uri } from "vscode";
import { compileTemplate, parseTemplate } from ".";

vi.mock("vscode");

describe("parseTemplate()", () => {
  test("parses basic templates", () => {
    // TODO: Separate out
    expect(parseTemplate("Hello")).toEqual([{ type: "text", value: "Hello" }]);
    expect(parseTemplate("${foo}")).toEqual([
      { type: "expression", value: "foo" },
    ]);
    expect(parseTemplate("$0")).toEqual([{ type: "expression", value: "$0" }]);
    expect(
      parseTemplate("Hello ${foo} test {} ${$0.toUpperCase()}${another} $11 ")
    ).toEqual([
      { type: "text", value: "Hello " },
      { type: "expression", value: "foo" },
      { type: "text", value: " test {} " },
      { type: "expression", value: "$0.toUpperCase()" },
      { type: "expression", value: "another" },
      { type: "text", value: " " },
      { type: "expression", value: "$1" },
      { type: "text", value: "1 " },
    ]);
  });
  expect(parseTemplate("Can we break ${'}'} it?")).toEqual([
    { type: "text", value: "Can we break " },
    { type: "expression", value: "'}'" },
    { type: "text", value: " it?" },
  ]);
  expect(
    parseTemplate(
      "Can we break ${foo.replace(/\\/'\"`/g, `${bar('\"\\'')}`)} it?"
    )
  ).toEqual([
    { type: "text", value: "Can we break " },
    { type: "expression", value: "foo.replace(/\\/'\"`/g, `${bar('\"\\'')}`)" },
    { type: "text", value: " it?" },
  ]);
  expect(parseTemplate("Can we break ${[{foo: '}'}]} it?")).toEqual([
    { type: "text", value: "Can we break " },
    { type: "expression", value: "[{foo: '}'}]" },
    { type: "text", value: " it?" },
  ]);
  // TODO: This should throw an error, not pass
  expect(parseTemplate("Can we break ${[{foo: '}'}]]]]]} it?")).toEqual([
    { type: "text", value: "Can we break " },
    { type: "expression", value: "[{foo: '}'}]]]]]} it?" },
  ]);
});

// TODO: Revisit this file. Some of the tests don't really make sense now that we're just using raw expressions instead of creating a language
describe("compileTemplate()", () => {
  test("string transforms work", () => {
    expect(
      compileTemplate("${$0.toUpperCase().trim()}")({
        documentUri: Uri.parse("file:///foo/bar"),
        rule: {} as any,
        matchGroups: [
          {
            match: "  Hello world! ",
            range: new Range(new Position(0, 0), new Position(0, 0)),
          },
        ],
      })
    ).toBe("HELLO WORLD!");
    // expect(compileTemplate("${$0.slice(0, -1)}")(["Hello world!"])).toBe(
    //   "Hello world"
    // );
    // expect(
    //   compileTemplate("${$0.slice(0, 6.0).trim()}")(["Hello world!"])
    // ).toBe("Hello");
    // expect(compileTemplate("${$0.replace(/\\|/, '_')}")(["A|B|C"])).toBe(
    //   "A_B|C"
    // );
    // expect(compileTemplate("${$0.replace(/\\|/g, '_')}")(["A|B|C"])).toBe(
    //   "A_B_C"
    // );
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
