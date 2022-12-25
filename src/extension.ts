import { fstat, fsync } from "fs";
import * as vscode from "vscode";
// TODO: Rename. Refactor. This was copied from https://github.com/lokalise/i18n-ally/blob/main/src/editor/annotation.ts
import { EXTENSION_NAME, getConfig, Rule } from "./config";
import {
  LinkDefinitionProvider,
  TerminalLinkDefintionProvider as TerminalLinkDefinitionProvider,
} from "./LinkDefinitionProvider";
import { testRules } from "./testRules";
import {
  textMatcher,
  rangesOverlapLines,
  replaceMatches,
  documentMatcher,
} from "./util";

const log = vscode.window.createOutputChannel("Patterns");

// TODOL What is this - when is it used?
let activeRules: vscode.Disposable[] = [];

// TODO: See how they do it here: https://github.com/Gruntfuggly/todo-tree/blob/master/src/extension.js
export function activate(context: vscode.ExtensionContext): void {
  initFromConfig(context);

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(EXTENSION_NAME)) {
      initFromConfig(context);
    }
  });

  // TODO: Add throttling
  // TODO: Dispose
  update();
  vscode.workspace.onDidChangeTextDocument(update);
  vscode.window.onDidChangeTextEditorSelection(update, null, []);

  // TODO: Implement disposing these and re-init on config change. Same with the colours above.
  activeRules.push(
    ...testRules.flatMap((rule) => {
      // TODO: Terminal links, too
      // TODO: Custom link text for hover
      return [
        vscode.languages.registerDocumentLinkProvider(
          rule.languages.map((language) => ({ language })),
          new LinkDefinitionProvider(rule)
        ),
        vscode.window.registerTerminalLinkProvider(
          new TerminalLinkDefinitionProvider(rule)
        ),
      ];
    })
  );
}

// const config = getConfig();

const allColorDecorations = new Set<vscode.TextEditorDecorationType>();

const disappearDecoration = vscode.window.createTextEditorDecorationType({
  textDecoration: "none; display: none;", // a hack to inject custom style
});

const noDecoration = vscode.window.createTextEditorDecorationType({});

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

// TODO: Throttle
function update() {
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
  for (const { matchGroups, rule } of matches) {
    for (const effect of rule.effects) {
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

        let replacementText = "";

        if (!lineIsInSelection && effect.replaceWith != null) {
          hideRanges.push(group.range);

          replacementText = replaceMatches(effect.replaceWith, matchGroups);
          if (
            effect.replaceWithMaxLength &&
            replacementText.length > effect.replaceWithMaxLength
          ) {
            replacementText =
              replacementText
                .slice(0, effect.replaceWithMaxLength)
                .replace(/\s+$/, "") + "…";
          }
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

        const renderOptions:
          | vscode.DecorationInstanceRenderOptions
          | undefined = replacementText
          ? {
              before: {
                color: effect.color,
                contentText: replacementText,
                fontStyle: "normal",
              },
            }
          : undefined;

        return {
          range: group.range,
          hoverMessage,
          renderOptions,
        };
      }
    );

    editor.setDecorations(decoration, ranges);
  }

  editor.setDecorations(disappearDecoration, hideRanges);
}

function initFromConfig(context: vscode.ExtensionContext): void {
  const config = getConfig();

  for (const rule of activeRules) {
    rule.dispose();
  }

  for (const rule of activeRules) {
    context.subscriptions.push(rule);
  }
}
