import { describe, expect, test, vi } from "vitest";
import type { Rule } from "../types/config";
import * as vscode from "vscode";
import {
  decorationTypes,
  getDocumentMatches,
  rangesOverlapLines,
  textToMinimalDocument,
} from "./documentUtils";

vi.mock("vscode");

describe("getDocumentMatches()", () => {
  const document = textToMinimalDocument(
    "This is my text and the link is FOO-123 and it is in the middle and here is another one BAR-3 that is the end, also FOO-0. And one lowercase one: bar-72 some text. Multiline now STARTsome stuff\nnewline\nandmoreEND.",
    "markdown"
  );
  const ruleDefaults: Pick<Rule, "languages" | "editor"> = {
    languages: ["*"],
    editor: [{ group: 0, decoration: decorationTypes.none }],
  };

  test("Basic matching works", () => {
    const rules: Rule[] = [
      { ...ruleDefaults, getRegex: () => new RegExp("FOO-\\d+", "gd") },
    ];
    const matches = getDocumentMatches(document, rules);
    expect(matches).toMatchObject([
      { matchGroups: [{ match: "FOO-123" }], rule: rules[0] },
      { matchGroups: [{ match: "FOO-0" }], rule: rules[0] },
    ]);
  });

  test("Matching with capture groups works", () => {
    const rules: Rule[] = [
      { ...ruleDefaults, getRegex: () => new RegExp("FOO-(\\d+)", "gd") },
    ];
    expect(getDocumentMatches(document, rules)).toMatchObject([
      { matchGroups: [{ match: "FOO-123" }, { match: "123" }] },
      { matchGroups: [{ match: "FOO-0" }, { match: "0" }] },
    ]);
  });

  test("Matching with multiple rules works", () => {
    const rule1: Rule = {
      ...ruleDefaults,
      getRegex: () => new RegExp("FOO-(\\d+)", "gd"),
    };
    const rule2: Rule = {
      ...ruleDefaults,
      getRegex: () => new RegExp("BAR-(\\d+)", "gd"),
    };
    expect(getDocumentMatches(document, [rule1, rule2])).toMatchObject([
      { matchGroups: [{ match: "FOO-123" }, { match: "123" }], rule: rule1 },
      { matchGroups: [{ match: "FOO-0" }, { match: "0" }], rule: rule1 },
      { matchGroups: [{ match: "BAR-3" }, { match: "3" }], rule: rule2 },
    ]);
  });

  test("Throws an error when the required flags are not present", () => {
    function createTestFn(flags: string) {
      return () => {
        getDocumentMatches(document, [
          {
            ...ruleDefaults,
            getRegex: () => new RegExp("FOO-(\\d+)", flags),
          },
        ]);
      };
    }
    expect(createTestFn("d")).toThrowError(
      `Regex must have the "d" and "g" flags.`
    );
    expect(createTestFn("g")).toThrowError(
      `Regex must have the "d" and "g" flags.`
    );
    expect(createTestFn("dg")).not.toThrowError();
  });
});

test("textToMinimalDocument()", () => {
  const document = textToMinimalDocument("This is my text", "markdown");
  expect(document.getText()).toBe("This is my text");
  expect(document.languageId).toBe("markdown");
  expect(document.positionAt(10).line).toBe(0);
  expect(document.positionAt(10).character).toBe(10);
  expect(document.uri).toBe(undefined);
});

const lines1To30 = new vscode.Range(1, 0, 30, 0);
const lines10To20 = new vscode.Range(10, 0, 20, 0);
const lines30To30 = new vscode.Range(30, 0, 30, 0);
const lines35To40 = new vscode.Range(35, 0, 40, 0);

test("rangesOverlapLines()", () => {
  expect(rangesOverlapLines(lines1To30, lines30To30)).toBe(true);
  expect(rangesOverlapLines(lines10To20, lines1To30)).toBe(true);
  expect(rangesOverlapLines(lines1To30, lines35To40)).toBe(false);

  // And in reverse
  expect(rangesOverlapLines(lines30To30, lines1To30)).toBe(true);
  expect(rangesOverlapLines(lines1To30, lines10To20)).toBe(true);
  expect(rangesOverlapLines(lines35To40, lines1To30)).toBe(false);
});
