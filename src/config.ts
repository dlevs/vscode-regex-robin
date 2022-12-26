import type * as vscode from "vscode";
import type { PartialDeep } from "type-fest";

interface Config {
  rules: Rule[];
}

type ConfigInput = PartialDeep<Config, { recurseIntoArrays: true }>;

export interface Rule {
  regex: string;
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
  effects: {
    captureGroup: number;
    link?: string;
    inlineReplacement?: string;
    hoverMessage?: string;
    style?: vscode.ThemableDecorationRenderOptions & {
      clear?: boolean;
    };
  }[];
}

// TODO: Rename
export const EXTENSION_NAME = "regexraven";

export function getConfig(): Config {
  // const config: PartialDeep<Config> =
  //   vscode.workspace.getConfiguration().get(EXTENSION_NAME) ?? {};
  const config = testConfig;

  return {
    rules: (config.rules ?? []).flatMap((rule): Rule | [] => {
      let { regex, regexFlags = {}, languages = [], effects = [] } = rule ?? {};

      // No language defined means all languages.
      if (!languages.length) {
        languages = ["*"];
      }

      if (!effects.length || !regex) {
        return [];
      }

      return {
        regex,
        regexFlags: {
          raw: expandRegexFlags(regexFlags),
        },
        // Remove null / undefined
        languages: languages.flatMap((language) => {
          return !language ? [] : language;
        }),
        effects: effects.flatMap((effect) => {
          if (!effect) {
            return [];
          }
          return {
            ...effect,
            captureGroup: effect?.captureGroup ?? 0,
            style: effect.style as vscode.ThemableDecorationRenderOptions,
          };
        }),
      };
    }),
  };
}

export function getRuleRegex(rule: Rule) {
  return new RegExp(rule.regex, rule.regexFlags.raw);
}

const testConfig: ConfigInput = {
  rules: [
    {
      regex: "(CORE|FS|JM|PPA|IN|LUK2)-\\d+",
      effects: [
        {
          link: "https://ticknovate.atlassian.net/browse/$0",
          style: { color: "#66D9EF" },
          hoverMessage: "Jira ticket **$0**",
          // inlineReplacement: "$0",
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
      // TODO: Try this, too   regex: "(TODO:)(.{1,10})(.*)?",
      regex: "(TODO:)(.{1,10})(.*)?",
      effects: [
        // TODO: Make the order not matter. Currently color highlghting works differnetly depending on ordering if group `0` is used
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
