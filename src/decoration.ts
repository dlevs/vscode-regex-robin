import * as vscode from "vscode";
import { groupByMap } from "./util/collectionUtils";
import {
  rangesOverlapLines,
  DocumentMatch,
  decorationTypes,
} from "./util/documentUtils";
import { replaceMatches } from "./util/stringUtils";

/**
 * Overwrites decorations (colors, inline elements, etc) with those
 * relevant for the current matches.
 */
export function updateDecoration(
  matches: DocumentMatch[],
  /**
   * All dynamic decoration types.
   *
   * This is needed so that we can iterate over _all_ styles, not just those
   * that are currently applying. This allows us to _unset_ the styles that
   * should not longer apply when applying relevant styles.
   */
  ruleDecorations: vscode.TextEditorDecorationType[]
) {
  const editor = vscode.window.activeTextEditor;

  if (!editor) return;

  // Group matches by decoration
  const allEffects = matches.flatMap(({ rule, matchGroups }) => {
    return rule.editor.map((effect) => {
      return { effect, matchGroups };
    });
  });
  const decorationMap = groupByMap(
    allEffects,
    ({ effect }) => effect.decoration
  );
  const selection = editor.selection;
  const hideRanges: vscode.Range[] = [];

  // Apply decoration
  for (const decoration of ruleDecorations) {
    const relevantMatches = decorationMap.get(decoration) ?? [];
    const ranges = relevantMatches.flatMap(
      ({ matchGroups, effect }): vscode.DecorationOptions | [] => {
        const group = matchGroups[effect.group];

        if (!group) {
          return [];
        }

        let inlineReplacementText = effect.inlineReplacement?.contentText;

        if (inlineReplacementText != null) {
          const showInlineReplacement = !rangesOverlapLines(
            group.range,
            selection
          );
          if (showInlineReplacement) {
            // An inline replacement is defined, and the cursor is not on this match
            // currently. Show the replacement instead.
            inlineReplacementText = replaceMatches(
              inlineReplacementText,
              matchGroups
            );

            // Hide the original text, showing only the replacement.
            hideRanges.push(group.range);
          } else {
            inlineReplacementText = undefined;
          }
        }

        const hoverMessage =
          effect.hoverMessage &&
          replaceMatches(effect.hoverMessage, matchGroups);

        return {
          range: group.range,
          hoverMessage,
          renderOptions:
            inlineReplacementText != null
              ? {
                  before: {
                    ...effect.inlineReplacement,
                    contentText: inlineReplacementText,
                  },
                }
              : undefined,
        };
      }
    );

    editor.setDecorations(decoration, ranges);
  }

  editor.setDecorations(decorationTypes.hide, hideRanges);
}
