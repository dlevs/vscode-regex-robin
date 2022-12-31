import * as vscode from "vscode";
import type { Rule } from "../types/config";

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
  matchGroups: [
    entireMatch: DocumentMatchGroup,
    ...captureGroups: (DocumentMatchGroup | null)[]
  ];
  documentUri?: vscode.Uri;
};

type DocumentMatchGroup = {
  match: string;
  range: vscode.Range;
};

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
      try {
        const text = document.getText();
        const regex = rule.getRegex();

        if (!regex.global || !regex.hasIndices) {
          throw new Error('Regex must have the "d" and "g" flags.');
        }

        return Array.from(text.matchAll(regex)).map((match): DocumentMatch => {
          const { indices = [] } = match;

          const matchGroups = match.map(
            (group, i): DocumentMatchGroup | null => {
              const matchIndices = indices[i];

              if (group == null || matchIndices == null) {
                return null;
              }

              const [start, end] = matchIndices;

              if (group == null) {
                return null;
              }

              return {
                match: group,
                range: new vscode.Range(
                  document.positionAt(start),
                  document.positionAt(end)
                ),
              };
            }
          );

          return {
            matchGroups: matchGroups as DocumentMatch["matchGroups"],
            rule,
            documentUri: document.uri,
          };
        });
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to execute regex.\n\n${(err as Error).message}`
        );
        throw err;
      }
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

/**
 * Check if two ranges share at least one line.
 */
export function rangesOverlapLines(range1: vscode.Range, range2: vscode.Range) {
  return (
    rangeContainsLines(range1, range2) || rangeContainsLines(range2, range1)
  );
}

/**
 * Check if `outer` range contains any lines in `inner`.
 */
function rangeContainsLines(outer: vscode.Range, inner: vscode.Range) {
  return (
    (inner.start.line >= outer.start.line &&
      inner.start.line <= outer.end.line) ||
    (inner.end.line >= outer.start.line && inner.end.line <= outer.end.line)
  );
}
