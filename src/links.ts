import * as vscode from "vscode";
import type { Rule } from "./types/config";
import {
  MinimalTextDocument,
  getDocumentMatches,
  DocumentMatch,
  textToMinimalDocument,
} from "./util/documentUtils";
import { replaceMatches } from "./util/stringUtils";

interface TerminalLink extends vscode.TerminalLink {
  target: string;
}

/**
 * Provide links for the given regex and target template.
 */
export class LinkProvider
  implements vscode.DocumentLinkProvider, vscode.TerminalLinkProvider
{
  private rules: Rule[];

  constructor(rules: Rule[]) {
    this.rules = rules;
  }

  provideDocumentLinks(document: MinimalTextDocument) {
    const matches = getDocumentMatches(document, this.rules);

    return this.mapMatches(matches, ({ range, target }) => ({
      range,
      target,
    }));
  }

  provideTerminalLinks(context: vscode.TerminalLinkContext) {
    const matches = getDocumentMatches(
      textToMinimalDocument(context.line, "terminal"),
      this.rules
    );

    return this.mapMatches(matches, ({ range, target }) => ({
      startIndex: range.start.character,
      length: range.end.character - range.start.character,
      target,
    }));
  }

  handleTerminalLink(link: TerminalLink) {
    vscode.commands.executeCommand("vscode.open", link.target);
  }

  private mapMatches<T>(
    matches: DocumentMatch[],
    transform: (params: { range: vscode.Range; target: vscode.Uri }) => T
  ) {
    return matches.flatMap(({ matchGroups, rule }) => {
      return rule.editor.flatMap((effect) => {
        const group = matchGroups[effect.group];

        if (!effect.link || !group) {
          return [];
        }

        const url = replaceMatches(effect.link, matchGroups);

        return transform({
          range: group.range,
          target: vscode.Uri.parse(url),
        });
      });
    });
  }
}
