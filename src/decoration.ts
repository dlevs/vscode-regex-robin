import * as vscode from "vscode";
import { groupByMap } from "./util/collectionUtils";
import {
  rangesOverlapLines,
  DocumentMatch,
  decorationTypes,
} from "./util/documentUtils";

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
  const allEffects = matches.flatMap((match) => {
    return match.rule.editor.map((effect) => {
      return { effect, match };
    });
  });
  const decorationMap = groupByMap(
    allEffects,
    ({ effect }) => effect.decoration
  );
  const selections = editor.selections;
  const hideRanges: vscode.Range[] = [];

  // Apply decoration
  for (const decoration of ruleDecorations) {
    const relevantMatches = decorationMap.get(decoration) ?? [];
    const ranges = relevantMatches.flatMap(
      ({ match, effect }): vscode.DecorationOptions | [] => {
        const group = match.matchGroups[effect.group];

        if (!group) {
          return [];
        }

        const inlineReplacement = effect.inlineReplacement?.contentText;
        let inlineReplacementText: string | undefined;

        if (inlineReplacement != null) {
          const showInlineReplacement = !selections.some((selection) =>
            rangesOverlapLines(group.range, selection)
          );
          if (showInlineReplacement) {
            // An inline replacement is defined, and the cursor is not on this match
            // currently. Show the replacement instead.
            inlineReplacementText = inlineReplacement(match);

            // Hide the original text, showing only the replacement.
            hideRanges.push(group.range);
          }
        }

        const hoverMessage = effect.hoverMessage?.(match);

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
