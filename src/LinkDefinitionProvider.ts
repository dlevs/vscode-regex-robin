import * as vscode from "vscode";

/**
 * Provide links for the given regex and target template.
 */
export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  private pattern: string;
  private flags: string;
  private targetTemplate: string;

  constructor(pattern: string, flags: string, targetTemplate: string) {
    this.pattern = pattern;
    this.targetTemplate = targetTemplate;
    this.flags = flags;

    if (!this.flags.includes("g")) {
      this.flags += "g";
    }
  }

  public provideDocumentLinks(
    document: Pick<vscode.TextDocument, "getText" | "positionAt">
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const regEx = new RegExp(this.pattern, this.flags);
    const text = document.getText();
    const links: vscode.DecorationOptions[] = [];

    let match: RegExpExecArray | null;
    while ((match = regEx.exec(text))) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      // Replace:
      // - $0 with match[0]
      // - $1 with match[1]
      // - \$1 with $1 (respect escape character)
      // - ...etc
      const url = this.targetTemplate
        .replace(/(^|[^\\])\$(\d)/g, (indexMatch, nonEscapeChar, index) => {
          return (
            nonEscapeChar +
            ((match as RegExpExecArray)[Number(index)] ?? `$${index}`)
          );
        })
        .replace(/\\\$/g, "$");
      const decoration: vscode.DocumentLink = {
        range,
        target: vscode.Uri.parse(url),
      };
      links.push(decoration);
    }

    return links;
  }
}
