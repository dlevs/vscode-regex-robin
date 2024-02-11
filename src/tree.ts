import * as vscode from "vscode";
import sortBy from "lodash/sortBy";
import { DocumentMatch } from "./util/documentUtils";
import { Config } from "./types/config";
import { DEFAULT_TREE_CONFIG } from "./config";

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

  private config: Config["tree"];
  private tree: Entry[];

  constructor() {
    this.config = DEFAULT_TREE_CONFIG;
    this.tree = this.mapMatchesToEntries([]);
  }

  updateMatches(matches: DocumentMatch[]) {
    this.tree = this.mapMatchesToEntries(matches);
    this.refresh();
  }

  updateConfig(config: Config["tree"]) {
    this.config = config;
    this.refresh();
  }

  getChildren(entry?: Entry): Entry[] {
    if (entry == null) {
      return this.tree;
    }

    return entry.children;
  }

  getTreeItem(entry: Entry): vscode.TreeItem {
    const description = this.config.includeFilenames
      ? entry.target?.uri?.toString(true).split("/").pop()
      : undefined;

    const collapsibleState = !entry.children.length
      ? vscode.TreeItemCollapsibleState.None
      : this.config.expanded
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.Collapsed;

    return {
      label: entry.label,
      description,
      collapsibleState,
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
    const entriesFlat = matches.flatMap((match) => {
      if (!match.rule.tree) return [];

      return {
        group: match.rule.tree.group.map((group) => group(match).trim()),
        label: match.rule.tree.label(match).trim(),
        target: match.documentUri && {
          uri: match.documentUri,
          range: match.matchGroups[0].range,
        },
      };
    });

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
    return mapDirectoryTreeToEntries(tree, this.config.sort);
  }

  private refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

/**
 * Map intermediate data structure optimized for building up tree
 * structure into a simpler format, with sorted values.
 */
function mapDirectoryTreeToEntries(
  tree: DirectoryTree,
  sort: boolean
): Entry[] {
  const children = Object.entries(tree.directories).map(
    ([label, directory]) => {
      return {
        label,
        children: mapDirectoryTreeToEntries(directory, sort),
      };
    }
  );

  let directories = children;
  let items = tree.items;

  if (sort) {
    directories = sortBy(directories, ({ label }) => label);
    items = sortBy(tree.items, ({ label }) => label);
  }

  return [
    ...directories,
    ...items.map((entry) => ({ children: [], ...entry })),
  ];
}
