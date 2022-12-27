import * as vscode from "vscode";
import { updateAnnotations } from "./annotations";
import { LinkProvider } from "./links";
import { EXTENSION_NAME, getConfig } from "./config";
import { TreeProvider } from "./tree";
import { getDocumentMatches } from "./util";
import { throttle } from "lodash";

export function activate(context: vscode.ExtensionContext): void {
  let app: undefined | vscode.Disposable;

  init();

  vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration(EXTENSION_NAME)) {
        init();
      }
    },
    null,
    context.subscriptions
  );

  function init() {
    app?.dispose();
    app = initFromConfig();
    context.subscriptions.push(app);
  }
}

function initFromConfig() {
  const config = getConfig();
  const update = throttle(
    () => {
      const matches = getDocumentMatches(config.rules);
      treeProvider.updateMatches(matches);
      updateAnnotations(matches, config.ruleDecorations);
    },
    50,
    { leading: true, trailing: true }
  );

  // TODO: This to return the annotation disposables, not "updateAnnotations"
  const matches = getDocumentMatches(config.rules);

  updateAnnotations(matches, config.ruleDecorations);
  // TODO: Don't register this if no tree config exists
  const treeProvider = new TreeProvider(matches);

  const disposable = vscode.Disposable.from(
    vscode.window.onDidChangeTextEditorSelection(update),
    vscode.window.registerTreeDataProvider("regexRaven", treeProvider),
    vscode.workspace.onDidChangeTextDocument(update),
    ...config.rules.flatMap((rule) => {
      const linkProvider = new LinkProvider(rule);

      return [
        vscode.languages.registerDocumentLinkProvider(
          rule.languages.map((language) => ({ language })),
          linkProvider
        ),
        vscode.window.registerTerminalLinkProvider(linkProvider),
      ];
    }),
    config
  );

  return disposable;
}
