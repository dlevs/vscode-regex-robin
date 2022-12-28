// TODO: Rename files in this project
import * as vscode from "vscode";
import execWithIndices, { RegExpExecArray } from "regexp-match-indices";
import { getRuleRegex, Rule } from "../config";

/**
 * A subset of `vscode.Document`, which can be used more easily for
 * arbitrary text matching, like terminal text, and during tests.
 */
export type MinimalTextDocument = {
  getText: vscode.TextDocument["getText"];
  positionAt: vscode.TextDocument["positionAt"];
  languageId: vscode.TextDocument["languageId"];
  uri?: vscode.TextDocument["uri"];
};

/**
 * A match found in a document for the regex defined in the `rule`.
 */
export type DocumentMatch = {
  rule: Rule;
  /**
   * An array representing the match. This is similar to the builtin
   * `RegExpExecArray` type, where index `0` is the entire match, and
   * the subsequent indexes are for subsets of the match - one for each
   * capture group.
   *
   * They differ from `RegExpExecArray` in that they include ranges for
   * where the text was found.
   */
  matchGroups: DocumentMatchGroup[];
  documentUri?: vscode.Uri;
};

type DocumentMatchGroup = {
  match: string;
  range: vscode.Range;
} | null;

/**
 * Get all matches in a document for a rule's regex pattern.
 */
export function getDocumentMatches(
  document: MinimalTextDocument,
  rules: Rule[]
): DocumentMatch[] {
  return rules
    .filter((rule) => {
      return (
        rule.languages.includes("*") ||
        rule.languages.includes(document.languageId)
      );
    })
    .flatMap((rule) => {
      const text = document.getText();
      const regex = getRuleRegex(rule);
      const matches: ({
        match: string;
        start: number;
        end: number;
      } | null)[][] = [];

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

      return matches.map((match): DocumentMatch => {
        const matchGroups = match.map((matchGroup) => {
          if (matchGroup == null) {
            return null;
          }

          return {
            match: matchGroup.match,
            range: new vscode.Range(
              document.positionAt(matchGroup.start),
              document.positionAt(matchGroup.end)
            ),
          };
        });

        return {
          matchGroups,
          rule,
          documentUri: document.uri,
        };
      });
    });
}

/**
 * Create a document that is a subset of `vscode.TextDocument`, which
 * is useful for sharing functionality that operates on these documents,
 * in contexts where such a document does not exist (terminal text and tests).
 */
export function textToMinimalDocument(
  text: string,
  languageId: string
): MinimalTextDocument {
  if (text.includes("\n")) {
    // This function is only currently for passing lines in the terminal
    // to the same functions used to handle documents. Those are only
    // 1 line.
    //
    // If this function is ever used for more than that, then we should
    // see if there is a better approach, as it's a bit jank.
    throw new Error("Text not expected contain newlines");
  }

  return {
    getText() {
      return text;
    },
    positionAt(offset) {
      return new vscode.Position(0, offset);
    },
    languageId,
  };
}

/**
 * Reusable text editor decoration types.
 */
export const decorationTypes = {
  /**
   * No-op decoration type. Does nothing.
   */
  none: vscode.window.createTextEditorDecorationType({}),
  /**
   * Hide content.
   */
  hide: vscode.window.createTextEditorDecorationType({
    textDecoration: "none; display: none;",
  }),
};

// TODO: Test
// TODO: Ideally argument order would not matter.
/**
 * Check if two ranges share at least one line.
 */
export function rangesOverlapLines(range1: vscode.Range, range2: vscode.Range) {
  return (
    (range1.start.line >= range2.start.line &&
      range1.start.line <= range2.end.line) ||
    (range1.end.line >= range2.start.line && range1.end.line <= range2.end.line)
  );
}
