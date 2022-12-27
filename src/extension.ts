import * as vscode from "vscode";
import { updateAnnotations } from "./annotations";
import {
  LinkDefinitionProvider,
  TerminalLinkDefinitionProvider,
} from "./links";
import { getConfig } from "./config";
import { TreeProvider } from "./tree";
import { getDocumentMatches } from "./util";
import { throttle } from "lodash";

// TODOL What is this - when is it used?

// TODO: See how they do it here: https://github.com/Gruntfuggly/todo-tree/blob/master/src/extension.js
export function activate(context: vscode.ExtensionContext): void {
  // initFromConfig(context);

  const update = throttle(
    () => {
      const matches = getDocumentMatches();
      treeProvider.updateMatches(matches);
      updateAnnotations(matches);
    },
    50,
    { leading: true, trailing: true }
  );

  // TODO: Something like that needed?
  // vscode.window.onDidChangeActiveTextEditor(editor => {
  // 	activeEditor = editor;
  // 	if (editor) {
  // 		triggerUpdateDecorations();
  // 	}
  // }, null, context.subscriptions);

  // TODO: This to return the annotation disposables, not "updateAnnotations"
  const matches = getDocumentMatches();

  updateAnnotations(matches);
  const treeProvider = new TreeProvider(matches);

  context.subscriptions.push(
    // vscode.workspace.onDidChangeConfiguration((event) => {
    //   if (event.affectsConfiguration(EXTENSION_NAME)) {
    //     initFromConfig(context);
    //   }
    // }),
    vscode.window.registerTreeDataProvider("regexRaven", treeProvider),
    vscode.window.onDidChangeTextEditorSelection(update),
    vscode.workspace.onDidChangeTextDocument(update),
    ...getConfig().rules.flatMap((rule) => {
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
