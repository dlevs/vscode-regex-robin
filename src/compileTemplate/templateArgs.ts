import path from "path";
import * as vscode from "vscode";
import { DocumentMatch } from "../util/documentUtils";
import { MatchString } from "./MatchString";

/**
 * A map of arguments that can be used in a template.
 *
 * Used mainly to ensure no `null` values are passed to the template function.
 */
type ArgMap = Record<string, string | number | MatchString>;

export function getArgs(
  match: Pick<DocumentMatch, "documentUri" | "matchGroups">
) {
  return Object.values(getArgMap(match));
}

export const argNames = Object.keys(
  getArgMap(
    // Dummy values, just to get the names of the arguments in the correct order.
    {
      matchGroups: [{ match: "", range: new vscode.Range(0, 0, 0, 0) }],
      documentUri: vscode.Uri.file(""),
    }
  )
);

function getArgMap(
  match: Pick<DocumentMatch, "documentUri" | "matchGroups">
): ArgMap {
  return {
    ...getAmbientArgMap(),
    ...getDocumentArgMap(match),
    ...getMatchArgMap(match),
  };
}

function getMatchArgMap(match: Pick<DocumentMatch, "matchGroups">): ArgMap {
  const $0 = new MatchString(match.matchGroups[0]);

  return {
    $0,
    $1: new MatchString(match.matchGroups[1]),
    $2: new MatchString(match.matchGroups[2]),
    $3: new MatchString(match.matchGroups[3]),
    $4: new MatchString(match.matchGroups[4]),
    $5: new MatchString(match.matchGroups[5]),
    $6: new MatchString(match.matchGroups[6]),
    $7: new MatchString(match.matchGroups[7]),
    $8: new MatchString(match.matchGroups[8]),
    $9: new MatchString(match.matchGroups[9]),
    lineNumber: $0.lineNumber,
  };
}

function getDocumentArgMap(match: Pick<DocumentMatch, "documentUri">): ArgMap {
  const workspace = vscode.workspace.workspaceFolders?.[0] ?? null;
  const workspaceFilePath = workspace?.uri.fsPath ?? "";
  const absoluteFilePath = match.documentUri?.fsPath ?? "";
  const relativeFilePath = path.relative(workspaceFilePath, absoluteFilePath);
  const { base, name, dir, ext } = path.parse(absoluteFilePath);

  return {
    // Absolute file path
    file: absoluteFilePath,
    fileBasename: base,
    fileBasenameNoExtension: name,
    fileDirname: path.dirname(absoluteFilePath),
    fileExtname: ext,

    // Relative file path
    relativeFile: relativeFilePath,
    relativeFileDirname: path.dirname(relativeFilePath),

    // Workspace
    fileWorkspaceFolder: workspaceFilePath,
    workspaceFolder: workspaceFilePath,
    workspaceFolderBasename: workspace?.name ?? "",

    // Misc
    cwd: dir,
  };
}

function getAmbientArgMap(): ArgMap {
  return {
    // TODO: This is heavy? Use some kind of deferred evaluation?
    selectedText:
      vscode.window.activeTextEditor?.document.getText(
        new vscode.Range(
          vscode.window.activeTextEditor.selection.start,
          vscode.window.activeTextEditor.selection.end
        )
      ) ?? "",
    pathSeparator: path.sep,
    userHome: process.env.HOME ?? "",
  };
}
