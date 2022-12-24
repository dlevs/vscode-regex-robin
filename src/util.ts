// TODO: Rename files in this project
import * as vscode from "vscode";
import execWithIndices from "regexp-match-indices";
import { Rule } from "./config";

// TODO: Unit tests

type MinimalRule = Pick<Rule, "linkPattern" | "linkPatternFlags">;

export function textMatcher(text: string, rule: MinimalRule) {
  let flags = rule.linkPatternFlags;
  if (!flags.includes("g")) {
    flags += "g";
  }

  const regEx = new RegExp(rule.linkPattern, flags);

  const matches = execWithIndices(regEx, text);

  if (!matches) {
    return [];
  }

  const { indices } = matches;

  return matches.map((match, i) => {
    const [start, end] = indices[i];

    return { match, start, end };
  });
}

export function documentMatcher(
  document: vscode.TextDocument,
  rule: MinimalRule
) {
  const match = textMatcher(document.getText(), rule);

  return match.map((match, i) => {
    return {
      ...match,
      range: new vscode.Range(
        document.positionAt(match.start),
        document.positionAt(match.end)
      ),
    };
  });
}

/**
 * Populate string with variables from regex capture groups.
 *
 * @example
 * ```ts
 * const match = /Hello (\w+)/.exec("Hello Clara");
 * replaceMatches("Your name is $1", match); // => "Your name is Clara"
 * ```
 *
 * Dollar signs can be escaped with a backslash, so `"\$1"` is not replaced.
 */
export function replaceMatches(template: string, match: RegExpExecArray) {
  return template
    .replace(/(^|[^\\])\$(\d)/g, (indexMatch, nonEscapeChar, index) => {
      return (
        nonEscapeChar +
        ((match as RegExpExecArray)[Number(index)] ?? `$${index}`)
      );
    })
    .replace(/\\\$/g, "$");
}

// TODO: Test
// TODO: Ideally argument order would not matter.
export function rangesOverlapLines(range1: vscode.Range, range2: vscode.Range) {
  return (
    (range1.start.line >= range2.start.line &&
      range1.start.line <= range2.end.line) ||
    (range1.end.line >= range2.start.line && range1.end.line <= range2.end.line)
  );
}
