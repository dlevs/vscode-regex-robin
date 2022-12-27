import * as vscode from "vscode";
import { orderBy, throttle } from "lodash";
import {
  rangesOverlapLines,
  replaceMatches,
  groupByMap,
  DocumentMatch,
  getAllDecorations,
  getDecorationTypes,
} from "./util";

// const config = getConfig();

export function updateAnnotations(matches: DocumentMatch[]) {
  const editor = vscode.window.activeTextEditor;

  // TODO: No - return editor from `getDocumentMatches`
  if (!editor) return;

  // Group matches by decoration
  const allEffects = matches.flatMap(({ rule, matchGroups }) => {
    // TODO: Any way to allow nested effects by doing a global sort on effects?
    // Or is that impossible due to partial overlapping?
    const sortedEffects = orderBy(
      rule.effects,
      (effect) => effect.captureGroup ?? 0,
      "desc"
    );

    return sortedEffects.map((effect) => {
      return { effect, matchGroups };
    });
  });

  // TODO: Decorations have "dispose" method, use that
  const decorationMap = groupByMap(
    allEffects,
    ({ effect }) => effect.decoration
  );
  const selection = editor.selection;
  const hideRanges: vscode.Range[] = [];
  // Apply decoration

  for (const decoration of getAllDecorations()) {
    const relevantMatches = decorationMap.get(decoration) ?? [];
    const ranges = relevantMatches.flatMap(
      ({ matchGroups, effect }): vscode.DecorationOptions | [] => {
        // TODO: Defaults higher up (?? 0)
        const group = matchGroups[effect.captureGroup ?? 0];

        if (!group) {
          return [];
        }

        const lineIsInSelection = rangesOverlapLines(group.range, selection);

        let replacementText: string | undefined;

        if (!lineIsInSelection && effect.inlineReplacement != null) {
          hideRanges.push(group.range);

          replacementText = replaceMatches(
            effect.inlineReplacement,
            matchGroups
          );
        }

        // Replace empty strings with a zero-width space so that the text
        // gets hidden if user configures it. `""` by itself does not hide
        // the original text.
        if (replacementText === "") {
          replacementText = "\u200B";
        }

        const hoverMessage =
          effect.hoverMessage &&
          replaceMatches(effect.hoverMessage, matchGroups);

        return {
          range: group.range,
          hoverMessage,
          renderOptions: replacementText
            ? {
                before: {
                  // TODO: Put in the config options ability to style this independently
                  ...effect.style,
                  contentText: replacementText,
                  fontStyle: "normal", // TODO
                },
              }
            : undefined,
        };
      }
    );

    editor.setDecorations(decoration, ranges);
  }

  editor.setDecorations(getDecorationTypes().hide, hideRanges);
}
