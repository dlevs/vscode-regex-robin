import { test, expect } from "vitest";
import { replaceDescriptionsWithMarkdown } from "./objectUtils";

test("replaceDescriptionsWithMarkdown()", () => {
  expect(
    replaceDescriptionsWithMarkdown({
      type: "object",
      description: "foo",
      anArray: [{ nested: { description: "yes" } }, "10"],
    })
  ).toMatchObject({
    type: "object",
    markdownDescription: "foo",
    anArray: [{ nested: { markdownDescription: "yes" } }, "10"],
  });
});
