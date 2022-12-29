import * as vscode from "vscode";
import type { PartialDeep, ReadonlyDeep } from "type-fest";
import { orderBy } from "lodash";
import { decorationTypes } from "./util/documentUtils";

interface Config {
  rules: Rule[];
  ruleDecorations: vscode.TextEditorDecorationType[];
  dispose: () => void;
}

// TODO: show warning if there's an error with a rule
type ConfigInput = ReadonlyDeep<
  PartialDeep<Config, { recurseIntoArrays: true }>
>;

export type Rule = ReadonlyDeep<{
  regex: string;
  // TODO: All less nested?
  regexFlags: {
    // TODO: string OR object here?
    raw: string;
    global?: boolean;
    caseInsensitive?: boolean;
    multiline?: boolean;
    dotAll?: boolean;
    unicode?: boolean;
    sticky?: boolean;
  };
  languages: string[];
  // TODO: This does not feel nailed down yet.
  // TODO: All less nested?
  tree?: { group: string; label: string };
  effects: RuleEffect[];
}>;

type RuleEffect = ReadonlyDeep<{
  captureGroup: number;
  link?: string;
  inlineReplacement?: string;
  inlineReplacementStyle?: Omit<
    vscode.ThemableDecorationAttachmentRenderOptions,
    "contentText"
  >;
  hoverMessage?: string;
  style?: vscode.ThemableDecorationRenderOptions;
  /**
   * Generated on init - not from config.
   */
  decoration: vscode.TextEditorDecorationType;
}>;

export const EXTENSION_NAME = "regexrobin";

export function getConfig(): Config {
  const ruleDecorations = new Set<vscode.TextEditorDecorationType>();
  // const config: PartialDeep<Config> =
  //   vscode.workspace.getConfiguration().get(EXTENSION_NAME) ?? {};
  const config = testConfig;
  // const config = testConfig;

  // The first-applied style "wins" when two styles apply to the same range.
  // As a human, the intuitive behavior is that rules that apply later in
  // the list overwrite the ones that came before, so we reverse the list.
  const reversedRules = (config.rules ? [...config.rules] : []).reverse();
  const rules = reversedRules.flatMap((rule): Rule | never[] => {
    let {
      regex,
      regexFlags = {},
      languages = [],
      effects = [],
      tree,
    } = rule ?? {};

    function filterOutWithError(message: string) {
      vscode.window.showErrorMessage(message);
      return [];
    }

    // No language defined means all languages.
    if (!languages.length) {
      languages = ["*"];
    }

    if (!effects.length) {
      return filterOutWithError('Rule defined with no "effects".');
    }

    if (!regex) {
      return filterOutWithError('Rule defined with no "regex" pattern.');
    }

    const decoratedEffects = effects.flatMap((effect): RuleEffect | never[] => {
      if (!effect) {
        return [];
      }

      const { style, ...rest } = effect;

      const decoration = style
        ? vscode.window.createTextEditorDecorationType(
            style as vscode.DecorationRenderOptions
          )
        : decorationTypes.none;

      ruleDecorations.add(decoration);

      return {
        ...rest,
        captureGroup: effect.captureGroup ?? 0,
        decoration,
      };
    });

    const sortedEffects = orderBy(
      decoratedEffects,
      (effect) => effect.captureGroup,
      "desc"
    );

    return {
      regex,
      regexFlags: {
        raw: expandRegexFlags(regexFlags),
      },
      tree: {
        group: tree?.group ?? "Ungrouped",
        label: tree?.label ?? "$0",
      },
      // Remove null / undefined
      languages: languages.flatMap((language) => {
        return !language ? [] : language;
      }),
      effects: sortedEffects,
    };
  });

  return {
    rules,
    ruleDecorations: Array.from(ruleDecorations),
    dispose: () => {
      for (const decoration of ruleDecorations) {
        decoration.dispose();
      }
    },
  };
}

export function getRuleRegex(rule: Rule) {
  return new RegExp(rule.regex, rule.regexFlags.raw);
}

const testConfig: ConfigInput = {
  rules: [
    {
      regex: "(CORE|FS|JM|PPA|IN|LUK2)-\\d+",
      tree: { group: "Jira links" },
      effects: [
        {
          link: "https://ticknovate.atlassian.net/browse/$0",
          style: {
            color: "#66D9EF",
            outline: "2px solid yellow",
            textDecoration: "none",
            overviewRulerColor: "red",
            borderRadius: "3px",
            cursor: "pointer",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            gutterIconPath:
              "/Users/daniellevett/Projects/vscode-regex-robin/assets/icon.png",
            gutterIconSize: "contain",
            fontStyle: "italic",
          },
          hoverMessage: "Jira ticket **$0**",

          // inlineReplacement: "$0",
        },
      ],
    },
    {
      regex: 'class="(.*?)"',
      tree: { group: "CSS", label: "$1" },
      // TODO: Rename. Not "effects". Maybe "groups"... think. And why can this not be empty? Should be that this / tree can be toggled independently
      effects: [
        {
          captureGroup: 1,
          // TODO:
          inlineReplacement: "•••",
          inlineReplacementStyle: {
            color: "#666",
          },
        },
      ],
    },
    {
      regex: "#(\\d+)",
      effects: [
        {
          link: "https://github.com/ticknovate/ticknovate/pull/$1",
          style: { color: "#66D9EF" },
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
      effects: [
        {
          hoverMessage: "Link to $3",
          link: "$3",
          style: { color: "#66D9EF" },
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
      effects: [
        {
          captureGroup: 1,
          style: { color: "yellow" },
        },
        {
          captureGroup: 2,
          style: { color: "purple" },
        },
        {
          captureGroup: 4,
          style: { color: "teal" },
        },
        {
          captureGroup: 3,
          style: { color: "orange" },
        },
        {
          hoverMessage: "Link to $3",
          link: "$3",
          style: { color: "#66D9EF", textDecoration: "none" },
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
      effects: [
        {
          captureGroup: 3,
          style: { color: "orange" },
        },
        {
          captureGroup: 2,
          style: { color: "purple" },
        },
        {
          captureGroup: 1,
          style: { color: "yellow" },
        },
        {
          hoverMessage: "Link to $3",
          link: "$3",
          style: { color: "#66D9EF", textDecoration: "none" },
        },
      ],
    },
    {
      regex: "\\[(2 .+?)\\](\\((.+?)\\))",
      effects: [
        {
          hoverMessage: "Link to $3",
          link: "$3",
          style: { color: "#66D9EF" },
          inlineReplacement: "$1",
        },
      ],
    },
    {
      regex: "\\[(3 .+?)\\](\\((.+?)\\))",
      effects: [
        {
          style: { color: "none" },
        },
        {
          captureGroup: 1,
          style: { color: "#66D9EF" },
        },
        {
          captureGroup: 2,
          inlineReplacement: "",
        },
      ],
    },
    {
      regex: "\\[(4 .+?)\\](\\((.+?)\\))",
      effects: [
        {
          style: { color: "none" },
        },
        {
          captureGroup: 1,
          style: { color: "#66D9EF" },
        },
        {
          captureGroup: 2,
          inlineReplacement: "",
        },
      ],
    },
    {
      regex: "\\[(5 .{1,14})(.+)?\\](\\((.+?)\\))",
      effects: [
        {
          style: { color: "#66D9EF" },
        },
        {
          captureGroup: 2,
          style: { color: "#66D9EF" },
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
      effects: [
        {
          link: "https://github.com/ticknovate/$1/pull/$2",
        },
      ],
    },
    {
      regex: "(TODO:)(.{1,10})(.*)?",
      effects: [
        {
          captureGroup: 3,
          // inlineReplacement: "…",
          inlineReplacement: "...",
          // TODO: Remove this?
          // inlineReplacementMaxLength: 10,
        },
        {
          style: { color: "#ff2722" },
        },
      ],
    },
    // TODO: Document overlapping rules / rule precedence
    {
      regex: "https?:\\/\\/([^\\/\\s)]+)(\\/[^\\s)]*)?",
      regexFlags: { caseInsensitive: true, global: true, multiline: true },
      effects: [
        {
          style: { color: "white" },
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

function expandRegexFlags(flags: Partial<Rule["regexFlags"]>) {
  if (!flags) {
    return "";
  }

  if (flags.raw) {
    return flags.raw;
  }

  let output = "";

  if (flags.global || flags.global == null) output += "g";
  if (flags.caseInsensitive) output += "i";
  if (flags.multiline) output += "m";
  if (flags.dotAll) output += "s";
  if (flags.unicode) output += "u";
  if (flags.sticky) output += "y";

  return output;
}
