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

    return matches.flatMap((matchGroups) => {
      return this.rule.effects.flatMap((effect): vscode.DocumentLink | [] => {
        if (!effect.linkTarget) {
          return [];
        }

        const url = replaceMatches(effect.linkTarget, matchGroups);

        return {
          // TODO: Default higher up
          range: matchGroups[effect.captureGroup ?? 0].range,
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

    return matches.flatMap((matchGroups) => {
      return this.rule.effects.flatMap((effect): TerminalLink | [] => {
        if (!effect.linkTarget) {
          return [];
        }

        const url = replaceMatches(effect.linkTarget, matchGroups);

        return {
          startIndex: matchGroups[effect.captureGroup ?? 0].start,
          length: matchGroups[effect.captureGroup ?? 0].match.length,
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
