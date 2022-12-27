import * as vscode from "vscode";
import { DocumentMatch, replaceMatches } from "./util";
import { groupBy, sortBy } from "lodash";

interface Entry {
  label: string;
  target?: {
    uri: vscode.Uri;
    range: vscode.Range;
  };
  children: Entry[];
}

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

  private mapMatchesToTree(matches: DocumentMatch[]) {
    const treeItems = matches.flatMap(({ rule, matchGroups, documentUri }) => {
      if (!rule.tree) return [];

      return {
        // TODO: We could have a separate pane per "group", so an entire "TODO" pane. Then it's more about user's wishes, not emphasising this extension
        group: rule.tree.group,
        label: replaceMatches(rule.tree.label, matchGroups).trim(),
        target: {
          uri: documentUri,
          range: matchGroups[0]!.range,
        },
      };
    });

    const groupedMap = Object.values(groupBy(treeItems, (item) => item.group));
    const grouped: Entry[] = Object.values(groupedMap).map(
      (children): Entry => {
        const sortedChildren = sortBy(children, (child) => child.label);

        return {
          label: `${children[0]!.group} (${children.length})`,
          children: sortedChildren.map((child) => ({
            ...child,
            children: [],
          })),
        };
      }
    );
    const sorted = sortBy(grouped, (group) => group.label);

    return sorted;
  }

  refresh(entry?: Entry): void {
    if (entry) {
      this._onDidChangeTreeData.fire(entry);
    } else {
      this._onDidChangeTreeData.fire(undefined);
    }
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
}
