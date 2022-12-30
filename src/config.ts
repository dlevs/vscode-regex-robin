import * as vscode from "vscode";
import type { SetRequired } from "type-fest";
import { orderBy } from "lodash";
import { decorationTypes } from "./util/documentUtils";

// TODO: show warning if there's an error with a rule - or does VSCode do that already?
// TODO: No need for external library? - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/hasIndices

/**
 * Config, as defined by the user in their settings.
 *
 * A script automatically generates the schema for this from the TypeScript types
 * in this file, injecting them into the package.json file for documentation /
 * intellisense purposes.
 */
interface ConfigInput {
  rules: RuleInput[];
}

export interface RuleInput {
  /**
   * A regex pattern to search for.
   */
  regex: string;
  /**
   * Flags to apply to the regex pattern.
   *
   * If you specify a string value, note that you will only receive 1 match maximum
   * unless you use the `g` flag.
   *
   * @default "g"
   */
  regexFlags?: string | RegexFlagsInput;
  /**
   * Languages to apply this rule to.
   *
   * If not specified, the rule will be applied to all languages.
   *
   * There is a special "terminal" language that can be used to provide links for
   * texts in the editor terminal.
   *
   * @default ["*"]
   */
  languages?: string[];
  /**
   * Effects to apply to the matched text in the text editor / terminal.
   *
   * ## Capture groups
   *
   * The `captureGroup` property defines which portion of the matched text
   * to apply the effect to. If omitted, it defaults to the entire match.
   *
   * For example, `captureGroup: 2` applies to "world" in a match for the
   * regex pattern `/(hello) (world)/`, the same way you'd use "$2" in
   * JavaScripts `String.prototype.replace(RegExp, String)` method.
   *
   * With this, you can style different parts of the matched text independently.
   *
   * ## Terminal links
   *
   * Effects in the terminal are limited to links (no styling).
   *
   * @default []
   */
  editor?: RuleEffectInput[];
  /**
   * Options for the tree view.
   */
  tree?: Partial<TreeParams>;
}

/**
 * Flags to apply to a regex pattern.
 *
 * Documentation taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).
 */
interface RegexFlagsInput {
  /**
   * Find all matches rather than stopping after the first match.
   *
   * @default true
   */
  global?: boolean;
  /**
   * When matching, casing differences are ignored.
   *
   * @default false
   */
  ignoreCase?: boolean;
  /**
   * Treat beginning and end assertions (`^` and `$`) as working over multiple
   * lines. In other words, match the beginning or end of each line (delimited
   * by `\n` or `\r`), not only the very beginning or end of the whole input string.
   *
   * @default false
   */
  multiline?: boolean;
  /**
   * Allows `.` to match newlines.
   *
   * @default false
   */
  dotAll?: boolean;
  /**
   * Treat the string being matched as a sequence of Unicode code points.
   *
   * @default false
   */
  unicode?: boolean;
  /**
   * Whether or not the search is sticky.
   *
   * @default false
   */
  sticky?: boolean;
}

interface TreeParams {
  /**
   * A label to group matches under in the tree view.
   *
   * @default "Ungrouped"
   */
  group: string;
  /**
   * The text to display for each match in the tree view.
   *
   * Capture group substitution is supported, e.g. "$1".
   *
   * @default "$0"
   */
  label: string;
}

interface RuleEffectInput extends vscode.DecorationRenderOptions {
  /**
   * The portion of the matched text to apply the effect to.
   *
   * @default 0
   */
  captureGroup?: number;
  /**
   * A link to open when the relevant match is clicked.
   *
   * Capture group substitution is supported, e.g. "$1".
   */
  link?: string;
  /**
   * Text to display when hovering over the relevant match.
   *
   * Capture group substitution is supported, e.g. "$1".
   */
  hoverMessage?: string;
  /**
   * Text to display in the editor instead of the matched text, so long
   * as the cursor (or current selection) is not on the line of the match.
   *
   * Capture group substitution is supported, e.g. "$1".
   *
   * The substitution is defined in the "contextText" property.
   */
  inlineReplacement?: string | InlineReplacement;
}

/**
 * Config that has been transformed into a usable format, with defaults applied,
 * regex patterns compiled, rules sorted, etc.
 *
 * It implements `vscode.Disposable` because it generates `ruleDecorations`,
 * which can be cleaned up when the extension is deactivated, or config changes.
 */
interface Config {
  rules: Rule[];
  ruleDecorations: vscode.TextEditorDecorationType[];
  dispose: () => void;
}

export interface Rule {
  getRegex(): RegExp;
  languages: string[];
  editor: EditorEffect[];
  tree?: TreeParams;
}

interface EditorEffect extends RuleEffectInput {
  /**
   * Capture group to apply this effect to.
   *
   * Default has been applied, so it's no longer an optional property.
   */
  captureGroup: number;
  /**
   * Inline replacement text.
   *
   * String values have been normalized to object.
   */
  inlineReplacement?: InlineReplacement;
  /**
   * Generated on init - not from config.
   */
  decoration: vscode.TextEditorDecorationType;
}

type InlineReplacement = SetRequired<
  vscode.ThemableDecorationAttachmentRenderOptions,
  "contentText"
>;

export const EXTENSION_NAME = "regexrobin";

export function getConfig(): Config {
  // const config: PartialDeep<Config> =
  //   vscode.workspace.getConfiguration().get(EXTENSION_NAME) ?? {};
  const { rules = [] } = testConfig;
  // const config = testConfig;

  // The first-applied style "wins" when two styles apply to the same range.
  // As a human, the intuitive behavior is that rules that apply later in
  // the list overwrite the ones that came before, so we reverse the list.
  const reversedRules = [...rules].reverse();

  const rulesOutput = reversedRules.flatMap((rule): Rule | never[] => {
    const { regex, regexFlags = {}, languages = ["*"], editor = [] } = rule;

    if (!editor.length) {
      return filterOutWithError('Rule defined with no "effects".');
    }

    if (!regex) {
      return filterOutWithError('Rule defined with no "regex" pattern.');
    }

    const expandedRegexFlags = processRegexFlags(regexFlags);

    return {
      /**
       * Get the regex for this rule.
       *
       * This is a function, since regexes are stateful and remember
       * the last match from `.exec()`.
       */
      getRegex() {
        return new RegExp(regex, expandedRegexFlags);
      },
      tree: rule.tree && {
        group: rule.tree.group ?? "Ungrouped",
        label: rule.tree.label ?? "$0",
      },
      languages,
      editor: processEditorEffects(editor),
    };
  });

  const ruleDecorations = new Set<vscode.TextEditorDecorationType>();
  for (const rule of rulesOutput) {
    for (const effect of rule.editor) {
      ruleDecorations.add(effect.decoration);
    }
  }

  return {
    rules: rulesOutput,
    ruleDecorations: Array.from(ruleDecorations),
    dispose: () => {
      for (const decoration of ruleDecorations) {
        decoration.dispose();
      }
    },
  };
}

// TODO: Test
function processRegexFlags(flags: RuleInput["regexFlags"] = {}) {
  if (typeof flags === "string") {
    return flags;
  }

  let output = "";

  if (flags.global || flags.global == null) output += "g";
  if (flags.ignoreCase) output += "i";
  if (flags.multiline) output += "m";
  if (flags.dotAll) output += "s";
  if (flags.unicode) output += "u";
  if (flags.sticky) output += "y";

  return output;
}

function processEditorEffects(effects: RuleEffectInput[]) {
  const decoratedEffects = effects.flatMap((effect): EditorEffect | never[] => {
    const {
      captureGroup = 0,
      link,
      hoverMessage,
      inlineReplacement: inlineReplacementInput,
      ...style
    } = effect;

    const inlineReplacement: InlineReplacement | undefined =
      inlineReplacementInput == null
        ? undefined
        : typeof inlineReplacementInput === "string"
        ? { contentText: inlineReplacementInput }
        : { ...inlineReplacementInput };

    // Replace empty strings with a zero-width space so that the text
    // gets hidden if user configures it. `""` by itself does not hide
    // the original text.
    if (inlineReplacement?.contentText === "") {
      inlineReplacement.contentText = "\u200B";
    }

    return {
      link,
      hoverMessage,
      inlineReplacement,
      captureGroup,
      decoration: style
        ? vscode.window.createTextEditorDecorationType(style)
        : decorationTypes.none,
    };
  });

  const sortedEffects = orderBy(
    decoratedEffects,
    (effect) => effect.captureGroup,
    "desc"
  );

  return sortedEffects;
}

// TODO: Necessary?
function filterOutWithError(message: string): never[] {
  vscode.window.showErrorMessage(message);
  return [];
}

const testConfig: ConfigInput = {
  rules: [
    {
      regex: "(CORE|FS|JM|PPA|IN|LUK2)-\\d+",
      tree: { group: "Jira links" },
      editor: [
        {
          link: "https://ticknovate.atlassian.net/browse/$0",
          color: "#66D9EF",
          gutterIconPath:
            "/Users/daniellevett/Projects/vscode-regex-robin/assets/icon.png",
          gutterIconSize: "contain",
          hoverMessage: "Jira ticket **$0**",
          // inlineReplacement: "$0",
        },
      ],
    },
    // TODO: Document this as a good example use case
    {
      regex: 'class="(.*?)"',
      // TODO: Rename. Not "effects". Maybe "groups"... think. And why can this not be empty? Should be that this / tree can be toggled independently
      editor: [
        {
          captureGroup: 1,
          inlineReplacement: { contentText: "•••", color: "#666" },
        },
      ],
    },
    {
      regex: "#(\\d+)",
      editor: [
        {
          link: "https://github.com/ticknovate/ticknovate/pull/$1",
          color: "#66D9EF",
          hoverMessage: "bar",
        },
      ],
    },
    // {
    //   // comment: "Markdown link",
    //   // TODO: Rename these params. Less focus on "links"
    //   regex: "\\[(.+?)\\]\\((.+?)\\)",
    //   languages: ["*"],
    //   effects: [
    //     {
    //       linkTarget: "$2",
    //       style: {color: "#66D9EF"},
    //       inlineReplacement: "🔗 $1",
    //       hoverMessage: "Link to $2",
    //     },
    //   ],
    // },
    // TODO: Document how this is not preferable to replacing only the 2nd part:
    // {
    //   // comment: "Markdown link",
    //   // TODO: Rename these params. Less focus on "links"
    //   regex: "\\[(.+?)\\]\\((.+?)\\)",
    //   languages: ["*"],
    //   effects: [
    //     {
    //       linkTarget: "$2",
    //       style: {color: "#66D9EF"},
    //       inlineReplacement: "[$1](…)",
    //       hoverMessage: "Link to $2",
    //     },
    //   ],
    // },
    {
      // comment: "Markdown link",
      // TODO: This nested capture group fully breaks the concepts used in `documentMatcher`...
      regex: "\\[(1 .+?)\\](\\((.+?)\\))",
      // TODO: rename "effects" to "groups"? Or "regexGroups"? Make "captureGroup" _just_ "group"?
      editor: [
        {
          hoverMessage: "Link to $3",
          link: "$3",
          color: "#66D9EF",
        },
        {
          captureGroup: 2,
          inlineReplacement: "",
        },
      ],
    },
    {
      // comment: "Markdown link",
      // TODO: Rename these params. Less focus on "links"
      // TODO: This nested capture group fully breaks the concepts used in `documentMatcher`...
      regex: "\\[(4 .+?)\\](\\()(.+?)(\\))",
      editor: [
        {
          captureGroup: 1,
          color: "yellow",
        },
        {
          captureGroup: 2,
          color: "purple",
        },
        {
          captureGroup: 4,
          color: "teal",
        },
        {
          captureGroup: 3,
          color: "orange",
        },
        {
          hoverMessage: "Link to $3",
          link: "$3",
          color: "#66D9EF",
          textDecoration: "none",
        },
      ],
    },
    // {
    //   regex: "\\[(2 .+?)\\](\\((.+?)\\))",
    //   languages: ["*"],
    //   effects: [
    //     {
    //       hoverMessage: "Link to $3",
    //       linkTarget: "$3",
    //       style: {color: "#66D9EF"},
    //       inlineReplacement: "$1",
    //     },
    //   ],
    // },
    {
      // This is testing nested capture groups
      regex: "\\[(6 .+?)\\](\\((.+?)\\))",
      editor: [
        {
          captureGroup: 3,
          color: "orange",
        },
        {
          captureGroup: 2,
          color: "purple",
        },
        {
          captureGroup: 1,
          color: "yellow",
        },
        {
          hoverMessage: "Link to $3",
          link: "$3",
          color: "#66D9EF",
          textDecoration: "none",
        },
      ],
    },
    {
      regex: "\\[(2 .+?)\\](\\((.+?)\\))",
      editor: [
        {
          hoverMessage: "Link to $3",
          link: "$3",
          color: "#66D9EF",
          inlineReplacement: "$1",
        },
      ],
    },
    {
      regex: "\\[(3 .+?)\\](\\((.+?)\\))",
      editor: [
        {
          color: "none",
        },
        {
          captureGroup: 1,
          color: "#66D9EF",
        },
        {
          captureGroup: 2,
          inlineReplacement: "",
        },
      ],
    },
    {
      regex: "\\[(4 .+?)\\](\\((.+?)\\))",
      editor: [
        {
          color: "none",
        },
        {
          captureGroup: 1,
          color: "#66D9EF",
        },
        {
          captureGroup: 2,
          inlineReplacement: "",
        },
      ],
    },
    {
      regex: "\\[(5 .{1,14})(.+)?\\](\\((.+?)\\))",
      editor: [
        {
          color: "#66D9EF",
        },
        {
          captureGroup: 2,
          color: "#66D9EF",
          inlineReplacement: "…",
        },
        {
          captureGroup: 3,
          inlineReplacement: "",
        },
      ],
    },
    {
      regex: "([A-Za-z_-]+)#(\\d+)",
      editor: [
        {
          link: "https://github.com/ticknovate/$1/pull/$2",
        },
      ],
    },
    {
      regex: "(TODO:)(.{1,10})(.*)?",
      editor: [
        {
          captureGroup: 3,
          // inlineReplacement: "…",
          inlineReplacement: "...",
          // TODO: Remove this?
          // inlineReplacementMaxLength: 10,
        },
        { color: "#ff2722" },
      ],
    },
    // TODO: Document overlapping rules / rule precedence
    {
      regex: "https?:\\/\\/([^\\/\\s)]+)(\\/[^\\s)]*)?",
      regexFlags: { ignoreCase: true, global: true, multiline: true },
      editor: [
        {
          color: "white",
          inlineReplacement: "$1",
          link: "$0",
        },
      ],
    },
    // {
    //   regex: "(TODO:)(.+)",
    //   languages: ["*"],
    //   effects: [
    //     // TODO: Make the order not matter. Currently color highlghting works differnetly depending on ordering if group `0` is used
    //     {
    //       captureGroup: 2,
    //       style: {color: "#ff2722"},
    //       inlineReplacement: "$2",
    //       inlineReplacementMaxLength: 10,
    //       hoverMessage: "a",
    //     },
    //     // {
    //     //   captureGroup: 1,
    //     //   // TODO: Rename. This is in line with "$2", so index is correct, but is "capture group" the right term?
    //     //   style: {color: "#ad1c14"},
    //     //   linkTarget: "https://google.com",
    //     //   hoverMessage: "a",
    //     // },
    //   ],
    // },
  ],
};
