// TODO: Rename files in this project
import * as vscode from "vscode";
import execWithIndices, { RegExpExecArray } from "regexp-match-indices";
import { Rule } from "./config";

// TODO: Unit tests

type MinimalRule = Pick<Rule, "linkPattern" | "linkPatternFlags">;

type MatchCaptureGroup = {
  match: string;
  start: number;
  end: number;
};

export function textMatcher(text: string, rule: MinimalRule) {
  let flags = rule.linkPatternFlags;
  if (!flags.includes("g")) {
    flags += "g";
  }

  const regEx = new RegExp(rule.linkPattern, flags);

  const matches: MatchCaptureGroup[][] = [];

  let match: RegExpExecArray | null;
  while ((match = execWithIndices(regEx, text))) {
    const { indices } = match;

    const groups = match.map((match, i) => {
      const [start, end] = indices[i];

      return { match, start, end };
    });

    matches.push(groups);
  }

  return matches;
}

export function documentMatcher(
  document: vscode.TextDocument,
  rule: MinimalRule
) {
  const matches = textMatcher(document.getText(), rule);

  return matches.map((match) => {
    return match.map((match) => {
      return {
        ...match,
        range: new vscode.Range(
          document.positionAt(match.start),
          document.positionAt(match.end)
        ),
      };
    });
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
export function replaceMatches(
  template: string,
  matchGroups: { match: string }[]
) {
  return template
    .replace(/(^|[^\\])\$(\d)/g, (indexMatch, nonEscapeChar, index) => {
      return nonEscapeChar + (matchGroups[Number(index)]?.match ?? `$${index}`);
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
