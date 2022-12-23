import * as vscode from "vscode";
// TODO: Rename. Refactor. This was copied from https://github.com/lokalise/i18n-ally/blob/main/src/editor/annotation.ts
import { EXTENSION_NAME, getConfig, Rule } from "./config";
import { LinkDefinitionProvider } from "./LinkDefinitionProvider";
import { matcher } from "./matcher";

let activeRules: vscode.Disposable[] = [];
const log = vscode.window.createOutputChannel("Patterns");

// TODO: See how they do it here: https://github.com/Gruntfuggly/todo-tree/blob/master/src/extension.js
export function activate(context: vscode.ExtensionContext): void {
  initFromConfig(context);

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(EXTENSION_NAME)) {
      initFromConfig(context);
    }
  });

  // TODO: Add throttling
  // TODO: Dispose
  update();
  vscode.workspace.onDidChangeTextDocument(update);
  vscode.window.onDidChangeTextEditorSelection(update, null, []);
}

// const config = getConfig();
const rules: (Rule & {
  color?: string;
  replaceWith?: string;
  hoverMessage?: string;
})[] = [
  {
    linkPattern: "(CORE|FS|JM|PPA|IN|LUK2)-\\d+",
    linkTarget: "https://ticknovate.atlassian.net/browse/$0",
    color: "#F92672",
    linkPatternFlags: "g",
    // replaceWith: "$0",
    hoverMessage: "foo",
    languages: ["*"],
  },
  {
    linkPattern: "#(\\d+)",
    linkTarget: "https://github.com/ticknovate/ticknovate/pull/$1",
    color: "#66D9EF",
    linkPatternFlags: "g",
    hoverMessage: "bar",
    languages: ["*"],
    // TODO: Something like this:
    // effects: [
    //   {
    //     group: 1,
    //     color: "red",
    //   }
    // ]
    // Allows us to say "color the first capture group red", leaving the rest of the text alone.
  },
  {
    // comment: "Markdown link",
    linkPattern: "\\[(.+?)\\]\\(.+?\\)",
    linkTarget: "$1",
    color: "#E6DB74",
    linkPatternFlags: "g",
    replaceWith: "🔗 $1",
    hoverMessage: "foo",
    languages: ["*"],
  },
  {
    linkPattern: "([A-Za-z_-]+)#(\\d+)",
    linkTarget: "https://github.com/ticknovate/$1/pull/$2",
    linkPatternFlags: "g",
    languages: ["*"],
  },
  {
    linkPattern: "infra#(\\d+)",
    linkPatternFlags: "g",
    languages: ["*"],
    linkTarget:
      "https://github.com/ticknovate/ticknovate-infrastructure/pull/$1",
  },
  {
    linkPattern: "backlog#(\\d+)",
    linkPatternFlags: "g",
    languages: ["*"],
    linkTarget: "https://ticknovate.monday.com/boards/2027894754/pulses/$1",
  },
  {
    linkPattern: "confluence#(\\d+)",
    linkPatternFlags: "g",
    languages: ["*"],
    linkTarget: "https://ticknovate.atlassian.net/wiki/spaces/TD/pages/$1",
  },
  {
    linkPattern: "v:([^\\s]+)",
    linkPatternFlags: "g",
    languages: ["*"],
    linkTarget:
      "https://ticknovate.atlassian.net/issues/?jql=fixVersion%20%3D%20$1",
  },
];

const allColorDecorations = new Set<vscode.TextEditorDecorationType>();

const disappearDecoration = vscode.window.createTextEditorDecorationType({
  textDecoration: "none; display: none;", // a hack to inject custom style
});

const decoratedRules = rules.map((rule) => {
  const decoration = rule.color
    ? vscode.window.createTextEditorDecorationType({
        textDecoration: `none; color: ${rule.color} !important; text-decoration: underline;`, // a hack to inject custom style
      })
    : null;

  if (decoration) {
    allColorDecorations.add(decoration);
  }

  return {
    ...rule,
    decoration,
  };
});

function update() {
  // log.appendLine("onDidChangeTextDocument! " + event.document.fileName);
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  // TODO: Check current doc
  if (!editor || !document) return;

  const matches = decoratedRules.flatMap((rule) => {
    return matcher(document, rule.linkPattern, rule.linkPatternFlags, rule);
  });

  // log.appendLine(`Matches: ${JSON.stringify(matches)}`);

  // activeRules = matches.map((match) => {
  //   return vscode.languages.registerDocumentLinkProvider(
  //     match.data.languages.map((language) => ({ language })),

  //     new LinkDefinitionProvider(
  //       // rule.linkPattern,
  //       "vertical", // TODO
  //       match.linkPatternFlags,
  //       match.linkTarget
  //     )
  //   );
  // });

  // const disappearDecorationType =
  //   vscode.window.createTextEditorDecorationType({
  //     textDecoration: "none; display: none;", // a hack to inject custom style
  //   });

  const decorationMap = new Map<
    vscode.TextEditorDecorationType,
    typeof matches
  >();

  // Group matches by decoration
  for (const match of matches) {
    if (match.data.decoration) {
      if (decorationMap.has(match.data.decoration)) {
        decorationMap.get(match.data.decoration)?.push(match);
      } else {
        decorationMap.set(match.data.decoration, [match]);
      }
    }
  }

  const selection = editor.selection;
  const hideRanges: vscode.Range[] = [];
  // Apply decoration

  for (const decoration of allColorDecorations) {
    const relevantMatches = decorationMap.get(decoration) ?? [];

    editor.setDecorations(
      decoration,
      relevantMatches.map(({ match, range, data }) => {
        const lineIsInSelection = rangesOverlapLines(selection, range);
        let replacementText = "";

        if (!lineIsInSelection && data.replaceWith) {
          // TODO: Break this into a nice util fn
          // Replace:
          // - $0 with match[0]
          // - $1 with match[1]
          // - \$1 with $1 (respect escape character)
          // - ...etc
          replacementText = data.replaceWith
            .replace(/(^|[^\\])\$(\d)/g, (indexMatch, nonEscapeChar, index) => {
              return (
                nonEscapeChar +
                ((match as RegExpExecArray)[Number(index)] ?? `$${index}`)
              );
            })
            .replace(/\\\$/g, "$");
          hideRanges.push(range);
        }

        return {
          range: range,
          // TODO: This doesn't work
          hoverMessage: data.hoverMessage,
          renderOptions: {
            before: {
              color: data.color,
              contentText: replacementText,
              fontStyle: "normal",
              // textDecoration: "underline",
              // backgroundColor: replacementText ? "#ffffff10" : "",
              // border: replacementText
              //   ? `0.5px solid ${match.data.color}; border-radius: 2px;`
              //   : "",
            },
          },
        };
      })
    );
  }

  editor.setDecorations(disappearDecoration, hideRanges);
}

// TODO: Move me
function getDocumentLinkForRule(
  range: vscode.Range,
  match: RegExpExecArray,
  rule: Rule
): vscode.DocumentLink {
  // Replace:
  // - $0 with match[0]
  // - $1 with match[1]
  // - \$1 with $1 (respect escape character)
  // - ...etc
  const url = rule.linkTarget
    .replace(/(^|[^\\])\$(\d)/g, (indexMatch, nonEscapeChar, index) => {
      return (
        nonEscapeChar +
        ((match as RegExpExecArray)[Number(index)] ?? `$${index}`)
      );
    })
    .replace(/\\\$/g, "$");

  return {
    range,
    target: vscode.Uri.parse(url),
  };
}

function rangesOverlapLines(range1: vscode.Range, range2: vscode.Range) {
  return (
    (range1.start.line >= range2.start.line &&
      range1.start.line <= range2.end.line) ||
    (range1.end.line >= range2.start.line && range1.end.line <= range2.end.line)
  );
}

function initFromConfig(context: vscode.ExtensionContext): void {
  const config = getConfig();

  for (const rule of activeRules) {
    rule.dispose();
  }

  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;

  // TODO: Check current doc
  if (!editor || !document) return;

  // const matches = config.rules.flatMap((rule) => {
  //   return matcher(document, rule.linkPattern, rule.linkPatternFlags, rule);
  // });

  // log.appendLine(`Matches: ${JSON.stringify(matches)}`);

  // // activeRules = matches.map((match) => {
  // //   return vscode.languages.registerDocumentLinkProvider(
  // //     match.data.languages.map((language) => ({ language })),

  // //     new LinkDefinitionProvider(
  // //       // rule.linkPattern,
  // //       "vertical", // TODO
  // //       match.linkPatternFlags,
  // //       match.linkTarget
  // //     )
  // //   );
  // // });

  // const disappearDecorationType = vscode.window.createTextEditorDecorationType({
  //   textDecoration: "none; display: none;", // a hack to inject custom style
  // });
  // const redDecorationType = vscode.window.createTextEditorDecorationType({
  //   textDecoration: "none; color: red;", // a hack to inject custom style
  // });

  // editor.setDecorations(redDecorationType, [
  //   new vscode.Range(document.positionAt(0), document.positionAt(10)),
  // ]);

  // activeRules.push(
  //   vscode.languages.registerHoverProvider("*", {
  //     provideHover(document, position) {
  //       // // if (document !== _current_doc || !_current_usages) return;

  //       const offset = document.offsetAt(position);
  //       // const key = _current_usages.keys.find(
  //       //   (k) => k.start <= offset && k.end >= offset
  //       // );
  //       // if (!key) return;

  //       const range = new vscode.Range(
  //         document.positionAt(0),
  //         document.positionAt(1)
  //       );

  //       return new vscode.Hover(
  //         `My Markdown ${position.line}:${position.character}`,
  //         range
  //       );
  //     },
  //   })
  // );

  // activeRules.push(
  //   vscode.languages.registerColorProvider("*", {
  //     provideDocumentColors(document, position) {
  //       // // if (document !== _current_doc || !_current_usages) return;

  //       // const offset = document.offsetAt(position);
  //       // const key = _current_usages.keys.find(
  //       //   (k) => k.start <= offset && k.end >= offset
  //       // );
  //       // if (!key) return;

  //       return new vscode.ColorInformation(
  //         `My Markdown ${position.line}:${position.character}`,
  //         new vscode.Range(document.positionAt(0), document.positionAt(1))
  //       );
  //     },
  //   })
  // );

  for (const rule of activeRules) {
    context.subscriptions.push(rule);
  }
}
