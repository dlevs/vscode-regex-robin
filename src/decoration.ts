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
   * This is needed for two reasons:
   * 1. They are in the correct application order, allowing capture group
   *    styles to apply on top of general match styles, and nested capture
   *    group styles to apply on top of the outer matches.
   * 2. Any decoration found not to be relevant is referred to anyway, just
   *    to _remove_ those decorations from the document where they may have
   *    previously applied.
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
