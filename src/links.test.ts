import * as assert from "assert";
import type * as vscode from "vscode";
import { describe, test } from "vitest";
import { LinkProvider } from "./links";

// TODO: This test comes from when this extension was copied from "vscode-pattern-links".
// It no longer makes sense for the emphasis to be on LinkDefinitionProvider. Change.
describe("LinkDefinitionProvider", () => {
  const document = {
    getText() {
      return "This is my text and the link is FOO-123 and it is in the middle and here is another one FOO-0 that is the end, also BAR-3. And one lowercase one: bar-72 some text. Multiline now STARTsome stuff\nnewline\nandmoreEND.";
    },
    positionAt() {
      // For test purposes only
      return null as unknown as vscode.Position;
    },
  };

  // TODO: This test comes from when this extension was copied from "vscode-pattern-links".
  // They need reworking now that the extension is more powerful. `getLinks` is a
  // stopgap to make the tests work.
  function getLinks(regex: string, regexFlags: string, link: string) {
    return new LinkProvider({
      regex,
      regexFlags: { raw: regexFlags },
      languages: ["*"],
      effects: [{ captureGroup: 0, link, decoration: null as any }],
    }).provideDocumentLinks(document);
  }

  test("Matches patterns to return links", () => {
    const links = getLinks("FOO-\\d+", "", "https://example.com/$0");
    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO-123"
    );
    assert.equal(
      links?.[1]?.target?.toString(true),
      "https://example.com/FOO-0"
    );
  });

  test("Capture groups work", () => {
    const links = getLinks(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/$1/$2?foo=bar"
    );
    assert.equal(links?.length, 3);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/123?foo=bar"
    );
    assert.equal(
      links?.[2]?.target?.toString(true),
      "https://example.com/BAR/3?foo=bar"
    );
  });

  test("Escape characters prevent substitution", () => {
    const links = getLinks(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/\\$1/$2?foo=bar"
    );
    assert.equal(links?.length, 3);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/$1/123?foo=bar"
    );
    assert.equal(
      links?.[2]?.target?.toString(true),
      "https://example.com/$1/3?foo=bar"
    );
  });

  test("Failed substitutions result in input remaining untouched (not 'undefined' in output)", () => {
    const links = getLinks("(FOO|BAR)-(\\d+)", "", "https://example.com/$1/$4");
    assert.equal(links?.length, 3);
    assert.equal(
      links?.[0]?.target?.toString(true),
      "https://example.com/FOO/$4"
    );
  });

  // TODO: These are less relevant now
  describe("Config: `rule.linkPatternFlags`", () => {
    test("`g` flag cannot be overwritten", () => {
      const links = getLinks(
        "(FOO|BAR)-(\\d+)",
        "i", // `i` here does not stop the usual `g` flag from taking effect
        "https://example.com/$1/$4"
      );
      assert.equal((links?.length ?? 0) > 1, true);
    });

    test("Single flags work", () => {
      const links = getLinks(
        "(BAR)-(\\d+)",
        "i", // `i` here does not stop the usual `g` flag from taking effect
        "https://example.com/$1/$2"
      );
      assert.equal(links?.length, 2);
      assert.equal(
        links?.[0]?.target?.toString(true),
        "https://example.com/BAR/3"
      );
      assert.equal(
        links?.[1]?.target?.toString(true),
        "https://example.com/bar/72"
      );
    });

    test("Multiple flags work", () => {
      const testWithFlag = (flags: string) => {
        return getLinks("start(.*?)end", flags, "https://example.com/$1");
      };

      // No flag
      assert.equal(testWithFlag("")?.length, 0);

      // Individual flags (not enough on their own)
      assert.equal(testWithFlag("i")?.length, 0);
      assert.equal(testWithFlag("s")?.length, 0);

      // Combined flags
      assert.equal(testWithFlag("is")?.length, 1);
      assert.equal(
        testWithFlag("is")?.[0]?.target?.toString(true),
        "https://example.com/some stuff\nnewline\nandmore"
      );
    });
  });
});
