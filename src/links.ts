import * as vscode from "vscode";
import { Rule } from "./config";
import {
  replaceMatches,
  MinimalDocument,
  getDocumentMatches,
  DocumentMatch,
  textToPseudoDocument,
} from "./util";

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

  provideDocumentLinks(document: MinimalDocument) {
    const matches = getDocumentMatches(this.rules, document);

    return this.mapMatches(matches, ({ range, target }) => ({
      range,
      target,
    }));
  }

  provideTerminalLinks(context: vscode.TerminalLinkContext) {
    const matches = getDocumentMatches(
      this.rules,
      textToPseudoDocument(context.line)
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
      return rule.effects.flatMap((effect) => {
        const group = matchGroups[effect.captureGroup ?? 0];

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
