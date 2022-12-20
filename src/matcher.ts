// TODO: Rename files in this project
import * as vscode from "vscode";

export function matcher<T>(
  // TODO: See if anything here can be cached (function that returns a function)
  document: vscode.TextDocument,
  pattern: string,
  flags: string,
  data: T
) {
  if (!flags.includes("g")) {
    flags += "g";
  }

  const regEx = new RegExp(pattern, flags);
  const text = document.getText();
  const matches: {
    range: vscode.Range;
    match: RegExpExecArray;
    data: T;
  }[] = [];

  let match: RegExpExecArray | null;
  while ((match = regEx.exec(text))) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    const range = new vscode.Range(startPos, endPos);

    matches.push({ match, range, data });
  }

  return matches;
}

/**
 * Provide links for the given regex and target template.
 */
export class LinkDefinitionProvider implements vscode.DocumentLinkProvider {
  public provideDocumentLinks(
    document: Pick<vscode.TextDocument, "getText" | "positionAt">
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const regEx = new RegExp(pattern, flags);
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
      const url = targetTemplate
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
