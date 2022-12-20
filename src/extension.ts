import * as vscode from "vscode";
// TODO: Rename. Refactor. This was copied from https://github.com/lokalise/i18n-ally/blob/main/src/editor/annotation.ts
import { EXTENSION_NAME, getConfig, Rule } from "./config";
import { LinkDefinitionProvider } from "./LinkDefinitionProvider";
import { matcher } from "./matcher";

let activeRules: vscode.Disposable[] = [];

// TODO: See how they do it here: https://github.com/Gruntfuggly/todo-tree/blob/master/src/extension.js
export function activate(context: vscode.ExtensionContext): void {
  initFromConfig(context);

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(EXTENSION_NAME)) {
      initFromConfig(context);
    }
  });
}

// TODO: Move me
function getDocumentLinkForRule(
  range: vscode.Range,
  match: RegExpExecArray,
  rule: Rule
): vscode.DocumentLink {
  // Replace:
  // - $0 with match[0]
  // - $1 with match[1]
  // - \$1 with $1 (respect escape character)
  // - ...etc
  const url = rule.linkTarget
    .replace(/(^|[^\\])\$(\d)/g, (indexMatch, nonEscapeChar, index) => {
      return (
        nonEscapeChar +
        ((match as RegExpExecArray)[Number(index)] ?? `$${index}`)
      );
    })
    .replace(/\\\$/g, "$");

  return {
    range,
    target: vscode.Uri.parse(url),
  };
}
const log = vscode.window.createOutputChannel("Patterns");

function initFromConfig(context: vscode.ExtensionContext): void {
  const config = getConfig();

  for (const rule of activeRules) {
    rule.dispose();
  }

  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  // TODO: Check current doc
  if (!editor || !document) return;

  const matches = config.rules.flatMap((rule) => {
    return matcher(document, rule.linkPattern, rule.linkPatternFlags, rule);
  });

  log.appendLine(`Matches: ${JSON.stringify(matches)}`);

  // activeRules = matches.map((match) => {
  //   return vscode.languages.registerDocumentLinkProvider(
  //     match.data.languages.map((language) => ({ language })),

  //     new LinkDefinitionProvider(
  //       // rule.linkPattern,
  //       "vertical", // TODO
  //       match.linkPatternFlags,
  //       match.linkTarget
  //     )
  //   );
  // });

  const disappearDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: "none; display: none;", // a hack to inject custom style
  });
  const redDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: "none; color: red;", // a hack to inject custom style
  });

  editor.setDecorations(redDecorationType, [
    new vscode.Range(document.positionAt(0), document.positionAt(10)),
  ]);

  activeRules.push(
    vscode.languages.registerHoverProvider("*", {
      provideHover(document, position) {
        // // if (document !== _current_doc || !_current_usages) return;

        const offset = document.offsetAt(position);
        // const key = _current_usages.keys.find(
        //   (k) => k.start <= offset && k.end >= offset
        // );
        // if (!key) return;

        const range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(1)
        );

        return new vscode.Hover(
          `My Markdown ${position.line}:${position.character}`,
          range
        );
      },
    })
  );

  // activeRules.push(
  //   vscode.languages.registerColorProvider("*", {
  //     provideDocumentColors(document, position) {
  //       // // if (document !== _current_doc || !_current_usages) return;

  //       // const offset = document.offsetAt(position);
  //       // const key = _current_usages.keys.find(
  //       //   (k) => k.start <= offset && k.end >= offset
  //       // );
  //       // if (!key) return;

  //       return new vscode.ColorInformation(
  //         `My Markdown ${position.line}:${position.character}`,
  //         new vscode.Range(document.positionAt(0), document.positionAt(1))
  //       );
  //     },
  //   })
  // );

  for (const rule of activeRules) {
    context.subscriptions.push(rule);
  }
}
