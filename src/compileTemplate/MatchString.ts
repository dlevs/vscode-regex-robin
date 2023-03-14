import { DocumentMatchGroup } from "../util/documentUtils";

/**
 * A match wrapped as a string, with additional properties.
 *
 * This allows for safe use of the match in template strings, with
 * the convenience of accessing the line and column numbers.
 *
 * @example
 * ```ts
 * const $1 = new MatchString(matchGroups[1]);
 *
 * // In the template
 * $1.toUpperCase() // The match, with a transform
 * $1.lineNumber    // The line number of the match
 * ```
 */
export class MatchString extends String {
  constructor(private group?: DocumentMatchGroup | null | undefined) {
    super(group?.match ?? "");
  }

  get lineNumber() {
    return this.group ? this.group.range.start.line + 1 : -1;
  }

  get columnNumber() {
    return this.group ? this.group.range.start.character + 1 : -1;
  }
}
