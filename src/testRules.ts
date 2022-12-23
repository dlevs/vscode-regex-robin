import { Rule } from "./config";

export const testRules: Rule[] = [
  {
    linkPattern: "(CORE|FS|JM|PPA|IN|LUK2)-\\d+",
    linkTarget: "https://ticknovate.atlassian.net/browse/$0",
    color: "#F92672",
    linkPatternFlags: "g",
    // replaceWith: "$0",
    hoverMessage: "Jira ticket **$0**",
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
    linkPattern: "\\[(.+?)\\]\\((.+?)\\)",
    linkTarget: "$2",
    color: "#E6DB74",
    linkPatternFlags: "g",
    replaceWith: "🔗 $1",
    hoverMessage: "Link to $2",
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
