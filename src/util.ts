// TODO: Rename files in this project
import * as vscode from "vscode";

// TODO: Unit tests

// TODO: Rename functions
export function matcher<T>(
  // TODO: See if anything here can be cached (function that returns a function)
  document: vscode.TextDocument,
  pattern: string,
  flags: string,
  data?: T
) {
  if (!flags.includes("g")) {
    flags += "g";
  }

  const regEx = new RegExp(pattern, flags);
  const text = document.getText();
  const matches: {
    range: vscode.Range;
    match: RegExpExecArray;
    data: T;
  }[] = [];

  let match: RegExpExecArray | null;
  while ((match = regEx.exec(text))) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(startPos, endPos);

    matches.push({ match, range, data });
  }

  return matches;
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
