import { expect, test, vi } from "vitest";
import { processRegexFlags } from "./config";

vi.mock("vscode");

test("processRegexFlags()", () => {
  expect(processRegexFlags()).toBe("dg");
  expect(processRegexFlags("d")).toBe("dg");
  expect(processRegexFlags("dgi")).toBe("dgi");
  expect(processRegexFlags({ ignoreCase: true })).toBe("idg");
  expect(processRegexFlags({ ignoreCase: true, dotAll: true })).toBe("isdg");
  expect(processRegexFlags({ ignoreCase: false })).toBe("dg");
  expect(processRegexFlags({ multiline: true })).toBe("mdg");
  expect(processRegexFlags({ unicode: true })).toBe("udg");
  // A random string is returned as-is (plus the missing "d" flag), allowing
  // users to pass in their own flags in future if there are new ones, with
  // no plugin update required.
  expect(processRegexFlags("anything")).toBe("anythingd");
});
