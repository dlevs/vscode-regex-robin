import * as vscode from "vscode";
import type { PartialDeep } from "type-fest";

interface Config {
  rules: Rule[];
}

type ConfigInput = PartialDeep<Config, { recurseIntoArrays: true }>;

export interface Rule {
  regex: string;
  regexFlags: {
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
    linkTarget?: string;
    inlineReplacement?: string;
    hoverMessage?: string;
    style?: vscode.ThemableDecorationRenderOptions & {
      clear?: boolean;
    };
  }[];
}

// TODO: Rename
export const EXTENSION_NAME = "patternlinks";

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

const testConfig: ConfigInput = {
  rules: [
    {
      regex: "(CORE|FS|JM|PPA|IN|LUK2)-\\d+",
      effects: [
        {
          linkTarget: "https://ticknovate.atlassian.net/browse/$0",
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
          linkTarget: "https://github.com/ticknovate/ticknovate/pull/$1",
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
      // TODO: Rename these params. Less focus on "links"
      // TODO: This nested capture group fully breaks the concepts used in `documentMatcher`...
      regex: "\\[(1 .+?)\\](\\((.+?)\\))",
      effects: [
        {
          hoverMessage: "Link to $3",
          linkTarget: "$3",
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
          linkTarget: "$3",
          style: { color: "#66D9EF" },
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
          linkTarget: "$3",
          style: { color: "#66D9EF" },
        },
      ],
    },
    {
      regex: "\\[(2 .+?)\\](\\((.+?)\\))",
      effects: [
        {
          hoverMessage: "Link to $3",
          linkTarget: "$3",
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
          linkTarget: "https://github.com/ticknovate/$1/pull/$2",
        },
      ],
    },
    // TODO: Overlapping rules make the "after" render option break. Look into it.
    // {
    //   regex: "https?:\\/\\/([^/\\s]+)(\\/[^\\s]*)?",
    //   regexFlags: "img",
    //   languages: ["*"],
    //   effects: [
    //     {
    //       // style: {color: "#ff2722"},

    //       inlineReplacement: "$1",
    //       linkTarget: "$0",
    //     },
    //   ],
    // },
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
