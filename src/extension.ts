import * as vscode from "vscode";
import { updateDecoration } from "./decoration";
import { LinkProvider } from "./links";
import { EXTENSION_NAME, getConfig } from "./config";
import { TreeProvider } from "./tree";
import { getDocumentMatches } from "./util/documentUtils";
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
  const treeProvider = new TreeProvider([]);
  const linkProvider = new LinkProvider(config.rules);
  const update = throttle(
    () => {
      const document = vscode.window.activeTextEditor?.document;
      const matches = document
        ? getDocumentMatches(document, config.rules)
        : [];
      treeProvider.updateMatches(matches);
      updateDecoration(matches, config.ruleDecorations);
    },
    50,
    { leading: true, trailing: true }
  );

  update();

  return vscode.Disposable.from(
    vscode.window.onDidChangeTextEditorSelection(update),
    // TODO: Don't register this if no tree config exists
    vscode.window.registerTreeDataProvider("regexRobin", treeProvider),
    vscode.window.registerTerminalLinkProvider(linkProvider),
    vscode.languages.registerDocumentLinkProvider(["*"], linkProvider),
    vscode.workspace.onDidChangeTextDocument(update),
    config
  );
}
