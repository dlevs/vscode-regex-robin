import * as vscode from "vscode";
import { EXTENSION_NAME, getConfig } from "./config";
import { LinkDefinitionProvider } from "./LinkDefinitionProvider";

let activeRules: vscode.Disposable[] = [];

export function activate(context: vscode.ExtensionContext): void {
  initFromConfig(context);

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(EXTENSION_NAME)) {
      initFromConfig(context);
    }
  });
}

function initFromConfig(context: vscode.ExtensionContext): void {
  const config = getConfig();

  for (const rule of activeRules) {
    rule.dispose();
  }

  activeRules = config.rules.map((rule) => {
    return vscode.languages.registerDocumentLinkProvider(
      rule.languages.map((language) => ({ language })),
      new LinkDefinitionProvider(
        rule.linkPattern,
        rule.linkPatternFlags,
        rule.linkTarget
      )
    );
  });

  for (const rule of activeRules) {
    context.subscriptions.push(rule);
  }
}
