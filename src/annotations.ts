import * as vscode from "vscode";
import { orderBy, throttle } from "lodash";
import { getConfig, getRuleRegex } from "./config";
import {
  rangesOverlapLines,
  replaceMatches,
  documentMatcher,
  groupByMap,
} from "./util";

// const config = getConfig();

const decorationTypes = {
  none: vscode.window.createTextEditorDecorationType({}),
  hide: vscode.window.createTextEditorDecorationType({
    textDecoration: "none; display: none;",
  }),
};

let allDecorations = new Set<vscode.TextEditorDecorationType>();

function getDecoratedRules() {
  // TODO:
  // for (const decoration of allDecorations) {
  //   // Clear old decorations
  //   vscode.window.activeTextEditor?.setDecorations(decoration, []);
  // }

  // allDecorations = new Set();

  return getConfig().rules.map((rule) => {
    return {
      ...rule,
      effects: rule.effects.map((effect) => {
        const decoration = effect.style
          ? vscode.window.createTextEditorDecorationType(effect.style)
          : decorationTypes.none;

        if (decoration) {
          allDecorations.add(decoration);
        }

        return { ...effect, decoration };
      }),
    };
  });
}

// TODO: Do this when config changes
const decoratedRules = getDecoratedRules();

function updateAnnotations() {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  if (!editor || !document) return;

  const matches = decoratedRules.flatMap((rule) => {
    return documentMatcher(document, getRuleRegex(rule)).map((matchGroups) => {
      return { matchGroups, rule };
    });
  });

  // const disappearDecorationType =
  //   vscode.window.createTextEditorDecorationType({
  //     textDecoration: "none; display: none;", // a hack to inject custom style
  //   });

  // Group matches by decoration
  // TODO: Use lodash
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

  const decorationMap = groupByMap(
    allEffects,
    ({ effect }) => effect.decoration
  );
  const selection = editor.selection;
  const hideRanges: vscode.Range[] = [];
  // Apply decoration

  for (const decoration of allDecorations) {
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
                  fontStyle: "normal",
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

export const updateAnnotationsThrottled = throttle(updateAnnotations, 50, {
  leading: true,
  trailing: true,
});
