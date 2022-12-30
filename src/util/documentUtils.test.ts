import { describe, expect, test, vi } from "vitest";
import {
  decorationTypes,
  getDocumentMatches,
  textToMinimalDocument,
} from "./documentUtils";

vi.mock("vscode");

// TODO: This test comes from when this extension was copied from "vscode-pattern-links".
// It no longer makes sense for the emphasis to be on LinkDefinitionProvider. Change.
describe("getDocumentMatches()", () => {
  // TODO: This test comes from when this extension was copied from "vscode-pattern-links".
  // They need reworking now that the extension is more powerful. `getLinks` is a
  // stopgap to make the tests work.
  function getMatches(regex: string, regexFlags: string, link: string) {
    const document = textToMinimalDocument(
      "This is my text and the link is FOO-123 and it is in the middle and here is another one FOO-0 that is the end, also BAR-3. And one lowercase one: bar-72 some text. Multiline now STARTsome stuff\nnewline\nandmoreEND.",
      "markdown"
    );

    return getDocumentMatches(document, [
      {
        getRegex() {
          return new RegExp(regex, regexFlags);
        },
        languages: ["*"],
        editor: [{ captureGroup: 0, link, decoration: decorationTypes.none }],
      },
    ]);
  }

  test("Matches patterns to return links", () => {
    const links = getMatches("FOO-\\d+", "gd", "https://example.com/$0");
    expect(links).toHaveLength(2);
    // expect(links[0]?.target?.toString(true), "https://example.com/FOO-123");
    // expect(links[1]?.target?.toString(true), "https://example.com/FOO-0");
  });

  // TODO: Complete the tests. Throw out old format that does not work

  // test("Capture groups work", () => {
  //   const links = getMatches(
  //     "(FOO|BAR)-(\\d+)",
  //     "",
  //     "https://example.com/$1/$2?foo=bar"
  //   );
  //   expect(links?.length, 3);
  //   expect(
  //     links?.[0]?.target?.toString(true),
  //     "https://example.com/FOO/123?foo=bar"
  //   );
  //   expect(
  //     links?.[2]?.target?.toString(true),
  //     "https://example.com/BAR/3?foo=bar"
  //   );
  // });

  // test("Escape characters prevent substitution", () => {
  //   const links = getMatches(
  //     "(FOO|BAR)-(\\d+)",
  //     "",
  //     "https://example.com/\\$1/$2?foo=bar"
  //   );
  //   expect(links?.length, 3);
  //   expect(
  //     links?.[0]?.target?.toString(true),
  //     "https://example.com/$1/123?foo=bar"
  //   );
  //   expect(
  //     links?.[2]?.target?.toString(true),
  //     "https://example.com/$1/3?foo=bar"
  //   );
  // });

  // test("Failed substitutions result in input remaining untouched (not 'undefined' in output)", () => {
  //   const links = getMatches(
  //     "(FOO|BAR)-(\\d+)",
  //     "",
  //     "https://example.com/$1/$4"
  //   );
  //   expect(links?.length, 3);
  //   expect(links?.[0]?.target?.toString(true), "https://example.com/FOO/$4");
  // });

  // // TODO: These are less relevant now
  // describe("Config: `rule.linkPatternFlags`", () => {
  //   test("`g` flag cannot be overwritten", () => {
  //     const links = getMatches(
  //       "(FOO|BAR)-(\\d+)",
  //       "i", // `i` here does not stop the usual `g` flag from taking effect
  //       "https://example.com/$1/$4"
  //     );
  //     expect((links?.length ?? 0) > 1, true);
  //   });

  //   test("Single flags work", () => {
  //     const links = getMatches(
  //       "(BAR)-(\\d+)",
  //       "i", // `i` here does not stop the usual `g` flag from taking effect
  //       "https://example.com/$1/$2"
  //     );
  //     expect(links?.length, 2);
  //     expect(links?.[0]?.target?.toString(true), "https://example.com/BAR/3");
  //     expect(links?.[1]?.target?.toString(true), "https://example.com/bar/72");
  //   });

  //   test("Multiple flags work", () => {
  //     const testWithFlag = (flags: string) => {
  //       return getMatches("start(.*?)end", flags, "https://example.com/$1");
  //     };

  //     // No flag
  //     expect(testWithFlag("")?.length, 0);

  //     // Individual flags (not enough on their own)
  //     expect(testWithFlag("i")?.length, 0);
  //     expect(testWithFlag("s")?.length, 0);

  //     // Combined flags
  //     expect(testWithFlag("is")?.length, 1);
  //     expect(
  //       testWithFlag("is")?.[0]?.target?.toString(true),
  //       "https://example.com/some stuff\nnewline\nandmore"
  //     );
  //   });
  // });
});
