import { Rule } from "./config";

export const testRules: Rule[] = [
  {
    linkPattern: "(CORE|FS|JM|PPA|IN|LUK2)-\\d+",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        linkTarget: "https://ticknovate.atlassian.net/browse/$0",
        color: "#66D9EF",
        hoverMessage: "Jira ticket **$0**",
        // replaceWith: "$0",
      },
    ],
  },
  {
    linkPattern: "#(\\d+)",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        linkTarget: "https://github.com/ticknovate/ticknovate/pull/$1",
        color: "#66D9EF",
        hoverMessage: "bar",
        // TODO: Something like this:
        // effects: [
        //   {
        //     group: 1,
        //     color: "red",
        //   }
        // ]
        // Allows us to say "color the first capture group red", leaving the rest of the text alone.
      },
    ],
  },
  // {
  //   // comment: "Markdown link",
  //   // TODO: Rename these params. Less focus on "links"
  //   linkPattern: "\\[(.+?)\\]\\((.+?)\\)",
  //   linkPatternFlags: "g",
  //   languages: ["*"],
  //   effects: [
  //     {
  //       linkTarget: "$2",
  //       color: "#66D9EF",
  //       replaceWith: "🔗 $1",
  //       hoverMessage: "Link to $2",
  //     },
  //   ],
  // },
  // TODO: Document how this is not preferable to replacing only the 2nd part:
  // {
  //   // comment: "Markdown link",
  //   // TODO: Rename these params. Less focus on "links"
  //   linkPattern: "\\[(.+?)\\]\\((.+?)\\)",
  //   linkPatternFlags: "g",
  //   languages: ["*"],
  //   effects: [
  //     {
  //       linkTarget: "$2",
  //       color: "#66D9EF",
  //       replaceWith: "[$1](…)",
  //       hoverMessage: "Link to $2",
  //     },
  //   ],
  // },
  {
    // comment: "Markdown link",
    // TODO: Rename these params. Less focus on "links"
    // TODO: This nested capture group fully breaks the concepts used in `documentMatcher`...
    linkPattern: "\\[(1 .+?)\\](\\((.+?)\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        hoverMessage: "Link to $3",
        linkTarget: "$3",
        color: "#66D9EF",
      },
      {
        captureGroup: 2,
        replaceWith: "",
      },
    ],
  },
  {
    // comment: "Markdown link",
    // TODO: Rename these params. Less focus on "links"
    // TODO: This nested capture group fully breaks the concepts used in `documentMatcher`...
    linkPattern: "\\[(4 .+?)\\](\\()(.+?)(\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
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
        linkTarget: "$3",
        color: "#66D9EF",
      },
    ],
  },
  {
    linkPattern: "\\[(2 .+?)\\](\\((.+?)\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        hoverMessage: "Link to $3",
        linkTarget: "$3",
        color: "#66D9EF",
        replaceWith: "$1",
      },
    ],
  },
  {
    // This is testing nested capture groups
    linkPattern: "\\[(6 .+?)\\](\\((.+?)\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      // TODO: THis works! We just need to sort by captureGroup desc
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
        linkTarget: "$3",
        color: "#66D9EF",
      },
    ],
  },
  {
    linkPattern: "\\[(2 .+?)\\](\\((.+?)\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        hoverMessage: "Link to $3",
        linkTarget: "$3",
        color: "#66D9EF",
        replaceWith: "$1",
      },
    ],
  },
  {
    linkPattern: "\\[(3 .+?)\\](\\((.+?)\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        color: "none",
      },
      // TODO: Fix this so the order does not matter
      {
        captureGroup: 1,
        color: "#66D9EF",
      },
      {
        captureGroup: 2,
        replaceWith: "",
      },
    ],
  },
  {
    linkPattern: "\\[(4 .+?)\\](\\((.+?)\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        color: "none",
      },
      // TODO: Fix this so the order does not matter
      {
        captureGroup: 1,
        color: "#66D9EF",
      },
      {
        captureGroup: 2,
        replaceWith: "",
      },
    ],
  },
  {
    linkPattern: "\\[(5 .{1,14})(.+)?\\](\\((.+?)\\))",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        color: "#66D9EF",
      },
      // TODO: Fix this so the order does not matter
      {
        captureGroup: 2,
        color: "#66D9EF",
        replaceWith: "…",
      },
      {
        captureGroup: 3,
        replaceWith: "",
      },
    ],
  },
  {
    linkPattern: "([A-Za-z_-]+)#(\\d+)",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        linkTarget: "https://github.com/ticknovate/$1/pull/$2",
      },
    ],
  },
  // TODO: Overlapping rules make the "after" render option break. Look into it.
  // {
  //   linkPattern: "https?:\\/\\/([^/\\s]+)(\\/[^\\s]*)?",
  //   linkPatternFlags: "img",
  //   languages: ["*"],
  //   effects: [
  //     {
  //       // color: "#ff2722",

  //       replaceWith: "$1",
  //       linkTarget: "$0",
  //     },
  //   ],
  // },
  {
    // TODO: Try this, too   linkPattern: "(TODO:)(.{1,10})(.*)?",
    linkPattern: "(TODO:)(.{1,10})(.*)?",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      // TODO: Make the order not matter. Currently color highlghting works differnetly depending on ordering if group `0` is used
      {
        captureGroup: 3,
        // replaceWith: "…",
        replaceWith: "...",
        // TODO: Remove this?
        // replaceWithMaxLength: 10,
      },
      {
        color: "#ff2722",
      },
    ],
  },
  // {
  //   linkPattern: "(TODO:)(.+)",
  //   linkPatternFlags: "g",
  //   languages: ["*"],
  //   effects: [
  //     // TODO: Make the order not matter. Currently color highlghting works differnetly depending on ordering if group `0` is used
  //     {
  //       captureGroup: 2,
  //       color: "#ff2722",
  //       replaceWith: "$2",
  //       replaceWithMaxLength: 10,
  //       hoverMessage: "a",
  //     },
  //     // {
  //     //   captureGroup: 1,
  //     //   // TODO: Rename. This is in line with "$2", so index is correct, but is "capture group" the right term?
  //     //   color: "#ad1c14",
  //     //   linkTarget: "https://google.com",
  //     //   hoverMessage: "a",
  //     // },
  //   ],
  // },
];
