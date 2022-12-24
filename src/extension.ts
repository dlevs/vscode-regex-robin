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
    return documentMatcher(document, rule).map((match) => {
      return { ...match, rule };
    });
  });

  // const disappearDecorationType =
  //   vscode.window.createTextEditorDecorationType({
  //     textDecoration: "none; display: none;", // a hack to inject custom style
  //   });

  const decorationMap = new Map<
    vscode.TextEditorDecorationType,
    // TODO: This is a mess
    (typeof matches[number] & {
      effect: typeof matches[number]["rule"]["effects"][number];
    })[]
  >();

  // Group matches by decoration
  for (const match of matches) {
    for (const effect of match.rule.effects) {
      if (effect.decoration) {
        const value = { ...match, effect };

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
    const ranges = relevantMatches.map(
      ({ match, effect, rangesByGroup }): vscode.DecorationOptions => {
        // TODO: Defaults higher up (?? 0)
        const range = rangesByGroup[effect.captureGroup ?? 0];
        const lineIsInSelection = rangesOverlapLines(range, selection);

        let replacementText = "";

        if (!lineIsInSelection && effect.replaceWith != null) {
          hideRanges.push(range);

          replacementText = replaceMatches(effect.replaceWith, match);
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
          effect.hoverMessage && replaceMatches(effect.hoverMessage, match);

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
          range,
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
