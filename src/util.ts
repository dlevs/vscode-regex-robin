// TODO: Rename files in this project
import * as vscode from "vscode";
import execWithIndices, { RegExpExecArray } from "regexp-match-indices";
import { getRuleRegex, Rule } from "./config";

const decorationTypes = {
  none: vscode.window.createTextEditorDecorationType({}),
  hide: vscode.window.createTextEditorDecorationType({
    textDecoration: "none; display: none;",
  }),
};

type MatchCaptureGroup = {
  match: string;
  start: number;
  end: number;
} | null;

export type MinimalDocument = Pick<
  vscode.TextDocument,
  "getText" | "positionAt"
>;

export function textMatcher(text: string, regex: RegExp) {
  const matches: MatchCaptureGroup[][] = [];

  let match: RegExpExecArray | null;
  while ((match = execWithIndices(regex, text))) {
    const { indices } = match;

    const groups = match.map((match, i) => {
      const matchIndices = indices[i];

      if (match == null || matchIndices == null) {
        return null;
      }

      const [start, end] = matchIndices;

      return { match, start, end };
    });

    matches.push(groups);
  }

  return matches;
}

export function documentMatcher(document: MinimalDocument, regex: RegExp) {
  const matches = textMatcher(document.getText(), regex);

  return matches.map((match) => {
    return match.map((match) => {
      if (match == null) {
        return null;
      }

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
  matchGroups: ({ match: string } | null)[]
) {
  return (
    template
      // TODO: Add a test for back-to-back matches
      .replace(/(?<!\\)\$(\d)/g, (indexMatch, index) => {
        return matchGroups[Number(index)]?.match ?? "";
      })
      .replace(/\\\$/g, "$")
  );
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

export function groupByMap<Key, Item>(
  collection: Iterable<Item>,
  getKey: (item: Item) => Key
) {
  let grouped = new Map<Key, Item[]>();

  for (const item of collection) {
    const key = getKey(item);

    if (grouped.has(key)) {
      grouped.get(key)?.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return grouped;
}

// TODO: Do this when config changes

// TODO: What about terminal matches?
export type DocumentMatch = ReturnType<typeof getDocumentMatches>[number];

export function getDocumentMatches(rules: Rule[]) {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  if (!editor || !document) return [];

  return rules
    .filter((rule) => {
      return (
        rule.languages.includes("*") ||
        rule.languages.includes(document.languageId)
      );
    })
    .flatMap((rule) => {
      return documentMatcher(document, getRuleRegex(rule)).map(
        (matchGroups) => {
          return { matchGroups, rule, documentUri: document.uri };
        }
      );
    });
}

// TODO: no.....
export function getDecorationTypes() {
  return decorationTypes;
}
