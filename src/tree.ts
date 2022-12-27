import * as vscode from "vscode";
import { DocumentMatch, documentMatcher, replaceMatches } from "./util";
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
        label: replaceMatches(rule.tree.label, matchGroups),
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
    // this.parseTree();
    if (entry) {
      this._onDidChangeTreeData.fire(entry);
    } else {
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  // rename(entry: Entry): void {
  // 	// vscode.window.showInputBox({ placeHolder: 'Enter the new label' }).then(value => {
  // 	// 	const editor = this.editor;
  // 	// 	const tree = this.tree;
  // 	// 	if (value !== null && value !== undefined && editor && tree) {
  // 	// 		editor.edit(editBuilder => {
  // 	// 			const path = json.getLocation(this.text, entry).path;
  // 	// 			let propertyNode: json.Node | undefined = json.findNodeAtLocation(tree, path);
  // 	// 			if (propertyNode.parent?.type !== 'array') {
  // 	// 				propertyNode = propertyNode.parent?.children ? propertyNode.parent.children[0] : undefined;
  // 	// 			}
  // 	// 			if (propertyNode) {
  // 	// 				const range = new vscode.Range(editor.document.positionAt(propertyNode.entry), editor.document.positionAt(propertyNode.entry + propertyNode.length));
  // 	// 				editBuilder.replace(range, `"${value}"`);
  // 	// 				setTimeout(() => {
  // 	// 					this.parseTree();
  // 	// 					this.refresh(entry);
  // 	// 				}, 100);
  // 	// 			}
  // 	// 		});
  // 	// 	}
  // 	// });
  // }

  // private onActiveEditorChanged(): void {
  // 	if (vscode.window.activeTextEditor) {
  // 		if (vscode.window.activeTextEditor.document.uri.scheme === 'file') {
  // 			const enabled = vscode.window.activeTextEditor.document.languageId === 'json' || vscode.window.activeTextEditor.document.languageId === 'jsonc';
  // 			vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', enabled);
  // 			if (enabled) {
  // 				this.refresh();
  // 			}
  // 		}
  // 	} else {
  // 		vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', false);
  // 	}
  // }

  // private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
  // 	if (this.tree && this.autoRefresh && changeEvent.document.uri.toString() === this.editor?.document.uri.toString()) {
  // 		for (const change of changeEvent.contentChanges) {
  // 			const path = json.getLocation(this.text, this.editor.document.entryAt(change.range.start)).path;
  // 			path.pop();
  // 			const node = path.length ? json.findNodeAtLocation(this.tree, path) : void 0;
  // 			this.parseTree();
  // 			this._onDidChangeTreeData.fire(node ? node.entry : void 0);
  // 		}
  // 	}
  // }

  // private parseTree(): void {
  // 	this.text = '';
  // 	this.tree = undefined;
  // 	this.editor = vscode.window.activeTextEditor;
  // 	if (this.editor && this.editor.document) {
  // 		this.text = this.editor.document.getText();
  // 		this.tree = json.parseTree(this.text);
  // 	}
  // }

  getChildren(entry?: Entry): Entry[] {
    if (entry == null) {
      return this.tree;
    }

    return entry.children;
  }

  getTreeItem(entry: Entry): vscode.TreeItem {
    // if (!this.tree) {
    //   throw new Error("Invalid tree");
    // }
    // if (!this.editor) {
    //   throw new Error("Invalid editor");
    // }

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

  select(range: vscode.Range) {
    if (this.editor) {
      this.editor.selection = new vscode.Selection(range.start, range.end);
    }
  }

  // private getIcon(node: json.Node): any {
  //   const nodeType = node.type;
  //   if (nodeType === "boolean") {
  //     return {
  //       light: this.context.asAbsolutePath(
  //         path.join("resources", "light", "boolean.svg")
  //       ),
  //       dark: this.context.asAbsolutePath(
  //         path.join("resources", "dark", "boolean.svg")
  //       ),
  //     };
  //   }
  //   if (nodeType === "string") {
  //     return {
  //       light: this.context.asAbsolutePath(
  //         path.join("resources", "light", "string.svg")
  //       ),
  //       dark: this.context.asAbsolutePath(
  //         path.join("resources", "dark", "string.svg")
  //       ),
  //     };
  //   }
  //   if (nodeType === "Entry") {
  //     return {
  //       light: this.context.asAbsolutePath(
  //         path.join("resources", "light", "Entry.svg")
  //       ),
  //       dark: this.context.asAbsolutePath(
  //         path.join("resources", "dark", "Entry.svg")
  //       ),
  //     };
}
