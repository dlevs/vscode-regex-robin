import * as assert from "assert";
import * as vscode from "vscode";
import { LinkDefinitionProvider } from "../../LinkDefinitionProvider";

suite("LinkDefinitionProvider", () => {
  const document = {
    getText() {
      return "This is my text and the link is FOO-123 and it is in the middle and here is another one FOO-0 that is the end, also BAR-3. And one lowercase one: bar-72 some text. Multiline now STARTsome stuff\nnewline\nandmoreEND.";
    },
    positionAt() {
      return new vscode.Position(0, 0);
    },
  };

  test("Matches patterns to return links", async () => {
    const links = await new LinkDefinitionProvider(
      "FOO-\\d+",
      "",
      "https://example.com/$0"
    ).provideDocumentLinks(document);
    assert.equal(links?.length, 2);
    assert.equal(
      links?.[0].target?.toString(true),
      "https://example.com/FOO-123"
    );
    assert.equal(
      links?.[1].target?.toString(true),
      "https://example.com/FOO-0"
    );
  });

  test("Capture groups work", async () => {
    const links = await new LinkDefinitionProvider(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/$1/$2?foo=bar"
    ).provideDocumentLinks(document);
    assert.equal(links?.length, 3);
    assert.equal(
      links?.[0].target?.toString(true),
      "https://example.com/FOO/123?foo=bar"
    );
    assert.equal(
      links?.[2].target?.toString(true),
      "https://example.com/BAR/3?foo=bar"
    );
  });

  test("Escape characters prevent substitution", async () => {
    const links = await new LinkDefinitionProvider(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/\\$1/$2?foo=bar"
    ).provideDocumentLinks(document);
    assert.equal(links?.length, 3);
    assert.equal(
      links?.[0].target?.toString(true),
      "https://example.com/$1/123?foo=bar"
    );
    assert.equal(
      links?.[2].target?.toString(true),
      "https://example.com/$1/3?foo=bar"
    );
  });

  test("Failed substitutions result in input remaining untouched (not 'undefined' in output)", async () => {
    const links = await new LinkDefinitionProvider(
      "(FOO|BAR)-(\\d+)",
      "",
      "https://example.com/$1/$4"
    ).provideDocumentLinks(document);
    assert.equal(links?.length, 3);
    assert.equal(
      links?.[0].target?.toString(true),
      "https://example.com/FOO/$4"
    );
  });

  suite("Config: `rule.linkPatternFlags`", () => {
    test("`g` flag cannot be overwritten", async () => {
      const links = await new LinkDefinitionProvider(
        "(FOO|BAR)-(\\d+)",
        "i", // `i` here does not stop the usual `g` flag from taking effect
        "https://example.com/$1/$4"
      ).provideDocumentLinks(document);
      assert.equal((links?.length ?? 0) > 1, true);
    });

    test("Single flags work", async () => {
      const links = await new LinkDefinitionProvider(
        "(BAR)-(\\d+)",
        "i", // `i` here does not stop the usual `g` flag from taking effect
        "https://example.com/$1/$2"
      ).provideDocumentLinks(document);
      assert.equal(links?.length, 2);
      assert.equal(
        links?.[0].target?.toString(true),
        "https://example.com/BAR/3"
      );
      assert.equal(
        links?.[1].target?.toString(true),
        "https://example.com/bar/72"
      );
    });

    test("Multiple flags work", async () => {
      const testWithFlag = (flags: string) => {
        return new LinkDefinitionProvider(
          "start(.*?)end",
          flags,
          "https://example.com/$1"
        ).provideDocumentLinks(document);
      };

      // No flag
      assert.equal((await testWithFlag(""))?.length, 0);

      // Individual flags (not enough on their own)
      assert.equal((await testWithFlag("i"))?.length, 0);
      assert.equal((await testWithFlag("s"))?.length, 0);

      // Combined flags
      assert.equal((await testWithFlag("is"))?.length, 1);
      assert.equal(
        (await testWithFlag("is"))?.[0].target?.toString(true),
        "https://example.com/some stuff\nnewline\nandmore"
      );
    });
  });
});
