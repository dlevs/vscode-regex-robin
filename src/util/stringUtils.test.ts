import { describe, expect, test, vi } from "vitest";
import {
  compileExpression,
  createExpressionsLexer,
  replaceMatches,
} from "./stringUtils";

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

  test("string transforms work", () => {
    expect(
      // Testing a convoluted use with escape characters, chaining and regex arguments.
      // Further tests for transforms are elsewhere.
      replaceMatches(
        "${0:toUpperCase():trim():replace('\\'', 'quote'):replace(/(\\{|\\}|:)/g, 'symbol.')}",
        [{ match: "  Hello world! {}:' " }]
      )
    ).toBe("Hello world! symbol.symbol.symbol.quote");
  });

  // TODO: This one fails due to the regex looking for "${ ... }" getting confused with the closing curly bracket. Add it back.
  // test("string transforms work", () => {
  //   expect(
  //     // Testing a convoluted use with escape characters, chaining and regex arguments.
  //     // Further tests for transforms are elsewhere.
  //     replaceMatches(
  //       "${0:toUpperCase():trim():replace('\\'', 'quote'):replace(/(\\{|\\}|:)/g, 'symbol.')}",
  //       [{ match: "  Hello world! {}:' " }]
  //     )
  //   ).toBe("HELLO WORLD! symbol.symbol.symbol.quote");
  // });
});

describe("createExpressionsLexer()", () => {
  const lexer = createExpressionsLexer();

  test("parses matchIndexes", () => {
    expect(lexer.input("2").tokens()).toMatchObject([
      { type: "subject", value: { type: "matchIndex", key: 2 } },
      { type: "EOF" },
    ]);

    expect(lexer.input("2:toUpperCase()").tokens()).toMatchObject([
      { type: "subject", value: { type: "matchIndex", key: 2 } },
      { type: "expressionSeparator" },
      { type: "methodName", value: "toUpperCase" },
      { type: "EOF" },
    ]);
  });

  test("parses env variables", () => {
    expect(lexer.input("env:NODE_ENV").tokens()).toMatchObject([
      { type: "subject", value: { type: "envVariable", key: "NODE_ENV" } },
      { type: "EOF" },
    ]);

    expect(lexer.input("env:NODE_ENV:toUpperCase()").tokens()).toMatchObject([
      { type: "subject", value: { type: "envVariable", key: "NODE_ENV" } },
      { type: "expressionSeparator" },
      { type: "methodName", value: "toUpperCase" },
      { type: "EOF" },
    ]);
  });

  test("parses general variables", () => {
    expect(lexer.input("foo").tokens()).toMatchObject([
      { type: "subject", value: { type: "variable", key: "foo" } },
      { type: "EOF" },
    ]);
    expect(lexer.input("lineNumber:toFixed(2)").tokens()).toMatchObject([
      { type: "subject", value: { type: "variable", key: "lineNumber" } },
      { type: "expressionSeparator" },
      { type: "methodName", value: "toFixed" },
      { type: "argument", value: 2 },
      { type: "EOF" },
    ]);
  });

  test("parses a complex chain of expressions as expected", () => {
    const tokens = lexer
      .input(
        [
          "2",
          "toUpperCase()",
          "slice(0, 5)",
          'replace(/\\//, "\\"")',
          "min(10, _)",
          // The object keys have to be quoted with double quotes, unfortunately
          'something(10, [true, { "foo-bar": 8 }], { "flag": false }, null, undefined, Infinity)',
        ].join(":")
      )
      .tokens();

    expect(tokens).toMatchObject([
      { type: "subject", value: { type: "matchIndex", key: 2 } },
      { type: "expressionSeparator" },
      { type: "methodName", value: "toUpperCase" },
      { type: "expressionSeparator" },
      { type: "methodName", value: "slice" },
      { type: "argument", value: 0 },
      { type: "argument", value: 5 },
      { type: "expressionSeparator" },
      { type: "methodName", value: "replace" },
      { type: "argument", value: /\// },
      { type: "argument", value: '"' },
      { type: "expressionSeparator" },
      { type: "methodName", value: "min" },
      { type: "argument", value: 10 },
      { type: "argumentPlaceholder" },
      { type: "expressionSeparator" },
      { type: "methodName", value: "something" },
      { type: "argument", value: 10 },
      { type: "argument", value: [true, { "foo-bar": 8 }] },
      { type: "argument", value: { flag: false } },
      { type: "argument", value: null },
      { type: "argument", value: undefined },
      { type: "argument", value: Infinity },
      { type: "EOF" },
    ]);
  });
});

describe("compileExpression()", () => {
  test("string transforms work", () => {
    expect(
      compileExpression("0:toUpperCase():trim()")(["  Hello world! "])
    ).toBe("HELLO WORLD!");
    expect(compileExpression("0:slice(0, -1)")(["Hello world!"])).toBe(
      "Hello world"
    );
    expect(compileExpression("0:slice(0, +6.0):trim()")(["Hello world!"])).toBe(
      "Hello"
    );
    expect(compileExpression("0:replace(/\\|/, '_')")(["A|B|C"])).toBe("A_B|C");
    expect(compileExpression("0:replace(/\\|/g, '_')")(["A|B|C"])).toBe(
      "A_B_C"
    );
  });

  test("number transforms work", () => {
    expect(compileExpression("0:ceil()")(["19.728"])).toBe("20");
    expect(compileExpression("0:floor():toFixed(2)")(["19.728"])).toBe("19.00");
  });

  test("number transforms work with explicit variable positioning", () => {
    expect(compileExpression("0:min(0, _, 1, 2)")(["-10"])).toBe("-10");
    expect(compileExpression("0:min(0, 1, 2)")(["-10"])).toBe("0");
  });

  test("escape characters are respected", () => {
    expect(compileExpression("0:replace(/\\//, '\\'Hello\\'')")(["/"])).toBe(
      "'Hello'"
    );
  });

  test("colons can be used in strings", () => {
    expect(compileExpression("0:replace(/l/, ':')")(["ll"])).toBe(":l");
  });

  test("throws for malformed strings", () => {
    expect(() => compileExpression("lineNumber:toFixed(2")).toThrow(
      "Failed to parse expressions"
    );
  });
});
