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
  return (
    template
      // TODO: Add a test for back-to-back matches
      .replace(/(?<!\\)\$(\d)/g, (indexMatch, index) => {
        return matchGroups[Number(index)]?.match ?? "";
      })
      .replace(/\\\$/g, "$")
  );
}
