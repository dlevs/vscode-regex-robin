import * as vscode from "vscode";

/**
 * Populate string with variables from regex capture groups.
 *
 * @example
 * ```ts
 * const match = /Hello (\w+)/.exec("Hello Clara");
 * replaceMatches("Your name is $1", match); // => "Your name is Clara"
 * ```
 *
 * Dollar signs can be escaped with a backslash, so `"\$1"` is not replaced.
 */
export function replaceMatches(
  template: string,
  matchGroups: ({ match: string } | null)[]
) {
  return template
    .replace(/(?<!\\)\$(?:(\d+)|\{(.+?)\})/g, (_match, group1, group2) => {
      const expression =
        typeof group1 === "string"
          ? group1 // E.g. $1
          : typeof group2 === "string"
          ? group2 // E.g. ${1}
          : "";
      const [variableName, ...transforms] = expression.split(":");

      if (!variableName) {
        return "";
      }

      const isNumber = /^\d+$/.test(variableName);

      let output: string | number = isNumber
        ? matchGroups[Number(variableName)]?.match ?? ""
        : "";

      for (const transform of transforms) {
        if (transform in String.prototype) {
          output = String(output)[transform as any]();
        } else if (transform in Number.prototype) {
          output = Number(output)[transform as any]();
        } else if (transform in Math) {
          output = Math[transform](Number(output));
        } else {
          vscode.window.showErrorMessage(
            `Unknown transform "${transform}" ignored`
          );
        }
      }

      return String(output);
    })
    .replace(/\\\$/g, "$");
}
