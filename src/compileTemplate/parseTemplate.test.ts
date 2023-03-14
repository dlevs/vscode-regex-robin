import { describe, expect, test } from "vitest";
import { parseTemplate } from "./parseTemplate";

describe("parseTemplate()", () => {
  test("parses basic templates", () => {
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
  expect(parseTemplate("Can we break ${[{foo: '}'}]]]]]} it?")).toEqual([
    { type: "text", value: "Can we break " },
    { type: "expression", value: "[{foo: '}'}]]]]]} it?" },
  ]);
});
