import * as vscode from "vscode";
import throttle from "lodash/throttle";
import { updateDecoration } from "./decoration";
import { LinkProvider } from "./links";
import { EXTENSION_NAME, getConfig } from "./config";
import { TreeProvider } from "./tree";
import { getDocumentMatches } from "./util/documentUtils";

const treeProvider = new TreeProvider();

export function activate(context: vscode.ExtensionContext): void {
  let app: undefined | vscode.Disposable;

  init();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("regexRobin", treeProvider),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(EXTENSION_NAME)) {
        init();
      }
    })
  );

  function init() {
    app?.dispose();
    app = initFromConfig();
    context.subscriptions.push(app);
  }
}

function initFromConfig() {
  const config = getConfig();
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

  treeProvider.updateConfig(config.tree);
  update();

  return vscode.Disposable.from(
    vscode.window.onDidChangeTextEditorSelection(update),
    vscode.window.registerTerminalLinkProvider(linkProvider),
    vscode.languages.registerDocumentLinkProvider(["*"], linkProvider),
    vscode.workspace.onDidChangeTextDocument(update),
    config
  );
}
