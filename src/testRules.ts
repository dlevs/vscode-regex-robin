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
  {
    // comment: "Markdown link",
    // TODO: Rename these params. Less focus on "links"
    linkPattern: "\\[(.+?)\\]\\((.+?)\\)",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      {
        linkTarget: "$2",
        color: "#66D9EF",
        replaceWith: "🔗 $1",
        hoverMessage: "Link to $2",
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
  //   linkPattern: "https?:\\/\\/([^/\\s]+)(\\/[^/\\s]+)?",
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
    linkPattern: "(TODO:)(.+)",
    linkPatternFlags: "g",
    languages: ["*"],
    effects: [
      // TODO: Make the order not matter. Currently color highlghting works differnetly depending on ordering if group `0` is used
      {
        captureGroup: 2,
        color: "#ff2722",
        // TODO: Make linkTarget optional
        linkTarget: "https://github.com/ticknovate/$1/pull/$2",
        hoverMessage: "b",
        replaceWith: "$2",
        replaceWithMaxLength: 10,
      },
      // {
      //   captureGroup: 1,
      //   // TODO: Rename. This is in line with "$2", so index is correct, but is "capture group" the right term?
      //   color: "#ad1c14",
      //   linkTarget: "https://google.com",
      //   hoverMessage: "a",
      // },
    ],
  },
];
