import * as vscode from "vscode";
import { updateAnnotationsThrottled } from "./annotations";
import { EXTENSION_NAME, getConfig } from "./config";
import {
  LinkDefinitionProvider,
  TerminalLinkDefinitionProvider,
} from "./links";
import { testRules } from "./testRules";

// TODOL What is this - when is it used?

// TODO: See how they do it here: https://github.com/Gruntfuggly/todo-tree/blob/master/src/extension.js
export function activate(context: vscode.ExtensionContext): void {
  // initFromConfig(context);
  updateAnnotationsThrottled();

  context.subscriptions.push(
    // vscode.workspace.onDidChangeConfiguration((event) => {
    //   if (event.affectsConfiguration(EXTENSION_NAME)) {
    //     initFromConfig(context);
    //   }
    // }),
    vscode.window.onDidChangeTextEditorSelection(updateAnnotationsThrottled),
    vscode.workspace.onDidChangeTextDocument(updateAnnotationsThrottled),
    ...testRules.flatMap((rule) => {
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

// function initFromConfig(context: vscode.ExtensionContext): void {
//   const config = getConfig();

//   for (const subscription of context.subscriptions) {
//     subscription.dispose();
//   }

//   context.subscriptions = [];

//   for (const rule of disposables) {
//     context.subscriptions.push(rule);
//   }
// }
