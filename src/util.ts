// TODO: Rename files in this project
import * as vscode from "vscode";
import { Rule } from "./config";

// TODO: Unit tests

type MinimalRule = Pick<Rule, "linkPattern" | "linkPatternFlags">;

// TODO: Rename functions. Move them out to another file
export function textMatcher(
  // TODO: See if anything here can be cached (function that returns a function)
  text: string,
  rule: MinimalRule
) {
  let flags = rule.linkPatternFlags;
  if (!flags.includes("g")) {
    flags += "g";
  }

  const regEx = new RegExp(rule.linkPattern, flags);
  const matches: RegExpExecArray[] = [];

  let match: RegExpExecArray | null;
  while ((match = regEx.exec(text))) {
    matches.push(match);
  }

  return matches;
}

export function documentMatcher(
  // TODO: See if anything here can be cached (function that returns a function)
  document: Pick<vscode.TextDocument, "getText" | "positionAt">,
  // TODO: improved function arguments
  rule: MinimalRule
) {
  return textMatcher(document.getText(), rule).map((match) => {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(startPos, endPos);

    return { match, range };
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
export function rangesOverlapLines(range1: vscode.Range, range2: vscode.Range) {
  return (
    (range1.start.line >= range2.start.line &&
      range1.start.line <= range2.end.line) ||
    (range1.end.line >= range2.start.line && range1.end.line <= range2.end.line)
  );
}
