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
    const fullMatch = match[0];

    // TODO: Add tests
    let currentIndex = 0;
    const rangesByGroup = [
      new vscode.Range(
        document.positionAt(match.index),
        document.positionAt(match.index + fullMatch.length)
      ),
      // TODO: More efficient way to do this?
      // TODO: Should move this group logic into textMatcher
      ...match.slice(1).map((group) => {
        const index = fullMatch.slice(currentIndex).indexOf(group);
        if (index === -1) {
          return null;
          // TODO: This happens for optional capture groups...
          // throw new Error(
          //   `Could not find group in full match. This should never happen. Text: ${group}`
          // );
        }

        const start = currentIndex + index;
        const end = start + group.length;
        const range = new vscode.Range(
          document.positionAt(match.index + start),
          document.positionAt(match.index + end)
        );
        currentIndex = end;

        return range;
      }),
    ];

    return { match, rangesByGroup };
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
