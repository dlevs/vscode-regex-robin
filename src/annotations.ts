import * as vscode from "vscode";
import { orderBy, sortBy, throttle } from "lodash";
import { testRules } from "./testRules";
import { rangesOverlapLines, replaceMatches, documentMatcher } from "./util";

// const config = getConfig();

const allColorDecorations = new Set<vscode.TextEditorDecorationType>();

const disappearDecoration = vscode.window.createTextEditorDecorationType({
  textDecoration: "none; display: none;", // a hack to inject custom style
});

const noDecoration = vscode.window.createTextEditorDecorationType({});

// TODO: Throttle
function updateAnnotations() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  if (!editor || !document) return;

  const matches = decoratedRules.flatMap((rule) => {
    return documentMatcher(document, rule).map((matchGroups) => {
      return { matchGroups, rule };
    });
  });

  // const disappearDecorationType =
  //   vscode.window.createTextEditorDecorationType({
  //     textDecoration: "none; display: none;", // a hack to inject custom style
  //   });

  const decorationMap = new Map<
    vscode.TextEditorDecorationType,
    // TODO: This is a mess
    {
      matchGroups: typeof matches[number]["matchGroups"];
      effect: typeof matches[number]["rule"]["effects"][number];
    }[]
  >();

  // Group matches by decoration
  // TODO: Use lodash

  for (const { matchGroups, rule } of matches) {
    const sortedEffects = orderBy(
      rule.effects,
      (effect) => effect.captureGroup ?? 0,
      "desc"
    );

    for (const effect of sortedEffects) {
      if (effect.decoration) {
        const value = { matchGroups, effect };

        if (decorationMap.has(effect.decoration)) {
          decorationMap.get(effect.decoration)?.push(value);
        } else {
          decorationMap.set(effect.decoration, [value]);
        }
      }
    }
  }

  const selection = editor.selection;
  const hideRanges: vscode.Range[] = [];
  // Apply decoration

  for (const decoration of allColorDecorations) {
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

        if (!lineIsInSelection && effect.replaceWith != null) {
          hideRanges.push(group.range);

          replacementText = replaceMatches(effect.replaceWith, matchGroups);
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
                  color: effect.color,
                  contentText: replacementText,
                  fontStyle: "normal",
                },
              }
            : undefined,
        };
      }
    );

    editor.setDecorations(decoration, ranges);
  }

  editor.setDecorations(disappearDecoration, hideRanges);
}

export const updateAnnotationsThrottled = throttle(updateAnnotations, 50, {
  leading: true,
  trailing: true,
});

const decoratedRules = testRules.map((rule) => {
  return {
    ...rule,
    effects: rule.effects.map((effect) => {
      const decoration = effect.color
        ? vscode.window.createTextEditorDecorationType({
            // TODO: Make underline an option
            // textDecoration: `none; color: ${effect.color}; text-decoration: underline;`,
            textDecoration: `none; color: ${effect.color};`,
          })
        : noDecoration;

      if (decoration) {
        allColorDecorations.add(decoration);
      }

      return { ...effect, decoration };
    }),
  };
});
