import * as vscode from "vscode";
import { Rule } from "./config";
import { matcher, replaceMatches } from "./util";

/**
 * Provide links for the given regex and target template.
 */
export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  private rule: Rule;

  constructor(rule: Rule) {
    this.rule = rule;
  }

  public provideDocumentLinks(document: vscode.TextDocument) {
    const matches = matcher(
      document,
      this.rule.linkPattern,
      this.rule.linkPatternFlags
    );

    return matches.map(({ range, match }): vscode.DocumentLink => {
      const url = replaceMatches(this.rule.linkTarget, match);

      return {
        range: range,
        target: vscode.Uri.parse(url),
      };
    });
  }
}
