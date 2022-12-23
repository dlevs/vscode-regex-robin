import * as vscode from "vscode";
import { Rule } from "./config";
import { textMatcher, replaceMatches, documentMatcher } from "./util";

/**
 * Provide links for the given regex and target template.
 */
export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  private rule: Rule;

  constructor(rule: Rule) {
    this.rule = rule;
  }

  provideDocumentLinks(document: vscode.TextDocument) {
    const matches = documentMatcher(document, this.rule);

    return matches.flatMap(({ rangesByGroup, match }) => {
      return this.rule.effects.map((effect): vscode.DocumentLink => {
        const url = replaceMatches(effect.linkTarget, match);

        return {
          // TODO: Default higher up
          range: rangesByGroup[effect.captureGroup ?? 0],
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
export class TerminalLinkDefintionProvider
  implements vscode.TerminalLinkProvider
{
  private rule: Rule;

  constructor(rule: Rule) {
    this.rule = rule;
  }

  provideTerminalLinks(context: vscode.TerminalLinkContext) {
    const matches = textMatcher(context.line, this.rule);

    return matches.flatMap((match) => {
      return this.rule.effects.map((effect): TerminalLink => {
        const url = replaceMatches(effect.linkTarget, match);

        return {
          startIndex: match.index,
          length: match[0].length,
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
