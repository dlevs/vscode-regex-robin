import * as vscode from "vscode";
import { getRuleRegex, Rule } from "./config";
import {
  textMatcher,
  replaceMatches,
  documentMatcher,
  MinimalDocument,
} from "./util";

/**
 * Provide links for the given regex and target template.
 */
export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  private rule: Rule;

  constructor(rule: Rule) {
    this.rule = rule;
  }

  provideDocumentLinks(document: MinimalDocument) {
    const matches = documentMatcher(document, getRuleRegex(this.rule));

    return matches.flatMap((matchGroups) => {
      return this.rule.effects.flatMap((effect): vscode.DocumentLink | [] => {
        const group = matchGroups[effect.captureGroup ?? 0];

        if (!effect.link || !group) {
          return [];
        }

        const url = replaceMatches(effect.link, matchGroups);

        return {
          // TODO: Default higher up
          range: group.range,
          target: vscode.Uri.parse(url),
        };
      });
    });
  }
}

interface TerminalLink extends vscode.TerminalLink {
  target: string;
}

/**
 * Provide links for the given regex and target template.
 */
export class TerminalLinkDefinitionProvider
  implements vscode.TerminalLinkProvider
{
  private rule: Rule;

  constructor(rule: Rule) {
    this.rule = rule;
  }

  provideTerminalLinks(context: vscode.TerminalLinkContext) {
    const matches = textMatcher(context.line, getRuleRegex(this.rule));

    return matches.flatMap((matchGroups) => {
      return this.rule.effects.flatMap((effect): TerminalLink | [] => {
        const group = matchGroups[effect.captureGroup ?? 0];

        if (!effect.link || !group) {
          return [];
        }

        const url = replaceMatches(effect.link, matchGroups);

        return {
          startIndex: group.start,
          length: group.match.length,
          target: url,
          // TODO: Tooltip does not render markdown. And be consistent with tooltip usage if possible.
          // tooltip:
          //   this.rule.hoverMessage &&
          //   replaceMatches(this.rule.hoverMessage, match),
        };
      });
    });
  }

  handleTerminalLink(link: TerminalLink) {
    vscode.commands.executeCommand("vscode.open", link.target);
  }
}
