import * as vscode from "vscode";
import sortBy from "lodash/sortBy";
import { DocumentMatch } from "./util/documentUtils";

interface Entry {
  label: string;
  children: Entry[];
  target?: {
    uri: vscode.Uri;
    range: vscode.Range;
  };
}

/**
 * An intermediate data shape for efficiently building nested
 * structure. Gets transformed into `Directory` for easy usage,
 * with all values sorted.
 *
 * In future, perhaps that can be deferred to when the user
 * actually clicks to expand a node in the tree.
 */
interface DirectoryTree {
  items: Omit<Entry, "children">[];
  directories: Record<string, DirectoryTree>;
}

/**
 * Display all matches in a file, grouped with the headings configured
 * by the user. The groups can be nested.
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
    this.tree = this.mapMatchesToEntries(matches);
  }

  updateMatches(matches: DocumentMatch[]) {
    this.tree = this.mapMatchesToEntries(matches);
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
        ? vscode.TreeItemCollapsibleState.Collapsed
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

  private mapMatchesToEntries(matches: DocumentMatch[]): Entry[] {
    // Get all entries in a flat array, each with a `group` property
    // defining where it should ultimately end up in the tree.
    //
    // Example of `group`: ["TODOs", "Urgent"]
    const entriesFlat = matches.flatMap(
      ({ rule, matchGroups, documentUri }) => {
        if (!rule.tree) return [];

        return {
          group: rule.tree.group.map((group) => group(matchGroups).trim()),
          label: rule.tree.label(matchGroups).trim(),
          target: documentUri && {
            uri: documentUri,
            range: matchGroups[0].range,
          },
        };
      }
    );

    // Put the entries into a nested tree structure.
    const tree: DirectoryTree = { items: [], directories: {} };

    for (const entry of entriesFlat) {
      let currentNode = tree;

      for (const group of entry.group) {
        currentNode = currentNode.directories[group] ??= {
          items: [],
          directories: {},
        };
      }

      currentNode.items.push(entry);
    }

    // Map entries into a more natural tree shape, with sorted values.
    return mapDirectoryTreeToEntries(tree);
  }

  private refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

/**
 * Map intermediate data structure optimized for building up tree
 * structure into a simpler format, with sorted values.
 */
function mapDirectoryTreeToEntries(tree: DirectoryTree): Entry[] {
  const children = Object.entries(tree.directories).map(
    ([label, directory]) => {
      return {
        label,
        children: mapDirectoryTreeToEntries(directory),
      };
    }
  );
  const sortedDirectories = sortBy(children, ({ label }) => label);
  const sortedItems = sortBy(tree.items, ({ label }) => label);

  return [
    ...sortedDirectories,
    ...sortedItems.map((entry) => ({ children: [], ...entry })),
  ];
}
