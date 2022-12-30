import * as vscode from "vscode";
import { groupBy, sortBy } from "lodash";
import { DocumentMatch } from "./util/documentUtils";
import { replaceMatches } from "./util/stringUtils";

interface Entry {
  label: string;
  children: Entry[];
  target?: {
    uri: vscode.Uri;
    range: vscode.Range;
  };
}

/**
 * Display all matches in a file, grouped with the headings configured
 * by the user.
 *
 * Nesting only goes one level deep. For example:
 * - TODOs
 *   - Matched TODO text 1
 *   - Matched TODO text 2
 * - FIXMEs
 *   - Matched FIXME text 1
 *   - Matched FIXME text 2
 *
 * Matches can be clicked to jump to where it was found in the source document.
 */
export class TreeProvider implements vscode.TreeDataProvider<Entry> {
  private _onDidChangeTreeData: vscode.EventEmitter<Entry | undefined> =
    new vscode.EventEmitter<Entry | undefined>();
  readonly onDidChangeTreeData: vscode.Event<Entry | undefined> =
    this._onDidChangeTreeData.event;

  private tree: Entry[];

  constructor(matches: DocumentMatch[]) {
    this.tree = this.mapMatchesToTree(matches);
  }

  updateMatches(matches: DocumentMatch[]) {
    this.tree = this.mapMatchesToTree(matches);
    this.refresh();
  }

  getChildren(entry?: Entry): Entry[] {
    if (entry == null) {
      return this.tree;
    }

    return entry.children;
  }

  getTreeItem(entry: Entry): vscode.TreeItem {
    return {
      label: entry.label,
      description: entry.target?.uri?.toString(true).split("/").pop(),
      tooltip: "This is the tooltip",
      // iconPath: "assets/icon.png",
      collapsibleState: entry.children.length
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
      command: entry.target && {
        command: "vscode.open",
        arguments: [
          entry.target.uri,
          {
            preview: true,
            selection: entry.target.range,
          },
        ],
        title: "Go to match",
      },
    };
  }

  private mapMatchesToTree(matches: DocumentMatch[]) {
    const treeItems = matches.flatMap(({ rule, matchGroups, documentUri }) => {
      if (!rule.tree) return [];

      return {
        // TODO: We could have a separate pane per "group", so an entire "TODO" pane. Then it's more about user's wishes, not emphasising this extension
        group: rule.tree.group,
        label: replaceMatches(rule.tree.label, matchGroups).trim(),
        target: documentUri && {
          uri: documentUri,
          range: matchGroups[0].range,
        },
        children: [],
      };
    });
    const treeItemsByGroup = groupBy(treeItems, (item) => item.group);
    const grouped: Entry[] = Object.values(treeItemsByGroup).map(
      (children): Entry => {
        const [firstChild] = children;
        const sortedChildren = sortBy(children, (child) => child.label);

        // Keep TypeScript happy
        if (!firstChild) {
          throw new Error(
            "Expected at least one child in array grouped by child attributes."
          );
        }

        return {
          label: `${firstChild.group} (${children.length})`,
          children: sortedChildren,
        };
      }
    );
    const sorted = sortBy(grouped, (group) => group.label);

    return sorted;
  }

  private refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
